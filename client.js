// ******* VARIABLES GLOBALES DEL SERVIDOR ********* //
var express = require('express');
var app = express();
var port = null;
var ip = null;
var store_name = ""; // Nombre de la tienda asociado al server 
var message = "";
var PrettyTable = require('prettytable');
var pt = new PrettyTable();
var headers = ['Tienda', 'Productos', 'Cantidad'];

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
    else if(message.split('#')[0] === 'totalproductos'){
        io.emit('total_product_store', message);
    }
});

// Respuesta del servidor al emitir la respuesta de añadir un producto a la tienda
io.on('add_product', function(data){
    console.log("Response server ::: ", data);
    io.disconnect();
})

// Respuesta del servidor al emitir la respuesta de listar los productos de la tienda
io.on('total_product_store', function(data){
    console.log("Response server ::: ", data);
    io.disconnect();
})

// Respuesta del servidor al emitir la respuesta de listar los productos en total
io.on('list_product_store', function(data){
    console.log("Response server ::: ", data);
    io.disconnect();
})
