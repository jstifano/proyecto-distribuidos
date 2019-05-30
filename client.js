// ******* VARIABLES GLOBALES DEL SERVIDOR ********* //
var express = require('express');
var app = express();
var port = null;
var ip = null;
var store_name = ""; // Nombre de la tienda asociado al server 
var message = "";
var PrettyTable = require('prettytable');
var pt = new PrettyTable();
var headers = ['Productos', 'Cantidad'];
var rows = [];

// Funcion para recibir los argumentos enviados al levantar un node de servidor
process.argv.forEach(function (val, index, array) {
    if(index === 2){
        ip = val;
    }
    else if(index === 3){
        port = parseInt(val, 10);
    }
    else{
        message = val;
    }
});

var io = require('socket.io-client').connect('http://'+ip+':'+port);
var fs = require('fs');

app.set('port', port);

// Conectar el socket del cliente con el del server
io.on('connect', function(socket){
    // Si el mensaje por parametros es agregarproducto, emito
    if(message.split('#')[0] === 'agregarproducto'){
        io.emit('add_product', message);
    }
    else if(message.split('#')[0] === 'listarproductos'){
        io.emit('list_product_store', message);
    }
    else if(message === 'totalproductos'){
        io.emit('total_product_store', message);
    }
});

// Respuesta del servidor al emitir la respuesta de añadir un producto a la tienda
io.on('add_product', function(data){
    console.log("Response server ::: ", data);
    io.disconnect();
})

// Respuesta del servidor al emitir la respuesta de listar todos los productos de la empresa
io.on('total_product_store', function(data){
    createTable(data, 'total');
    io.disconnect();
})

// Respuesta del servidor al emitir la respuesta de listar los productos en total
io.on('list_product_store', function(data){
    createTable(data, 'listar');
    io.disconnect();
})


function createTable(data, type){
    if(type === 'listar'){
        if(!data){
            rows = [['No hay productos', 0]];
            pt.create(headers, rows);
            pt.print(); // Pinto la tabla vacia ya que no hay productos en la tienda
            rows = [];
        }
        else {
            let arrayOfProducts = data.split(',');

            arrayOfProducts.forEach(product =>  {
                let code = product.split('#')[0];
                let quantity = product.split('#')[1];
                let elements = [];
                elements.push(code);
                elements.push(quantity);
                rows.push(elements);
                code = "";
                quantity = "";
                elements = [];
            })

            pt.create(headers, rows);
            pt.print(); // Pinto la tabla con el resultado del inventario de la tienda  
        }  
    }
    else {
        if(data.split(',').length === 1){
            let code = data.split('#')[0];
            let quantity = data.split('#')[1];
            
            elements.push(code);
            elements.push(quantity);
            rows.push(elements);

            pt.create(headers, rows);
            pt.print(); // Pinto la tabla con el resultado del inventario de la tienda
        }
        else {
            let arrayOfProducts = data.split(',');

            arrayOfProducts.forEach(product =>  {
                let code = product.split('#')[0];
                let quantity = product.split('#')[1];
                let elements = [];
                elements.push(code);
                elements.push(quantity);
                rows.push(elements);
                code = "";
                quantity = "";
                elements = [];
            })

            pt.create(headers, rows);
            pt.print(); // Pinto la tabla con el resultado del inventario de la tienda
        }
    }
    return;
}