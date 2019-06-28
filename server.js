// ******* VARIABLES GLOBALES DEL SERVIDOR ********* //
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var fs = require('fs');
var ps = null; // Puerto de salida
var pe = null; // Puerto de entrada
var pc = null; // Puerto del cliente
var store_name = "";
var storeData = "";
var productList = []; //Lista de productos en inventario
var lastNode = false;
var ip = "";
var ipToConnect = "";
// ******* VARIABLES GLOBALES DEL SERVIDOR ********* //

// Parametros a recibir mediante la consola
process.argv.forEach(function(val, index, array){
    if(index === 2){
        ip = val.split('#')[0]; // Ip la cual se va levantar el nodo 
        ipToConnect = val.split('#')[1]; // Ip a la cual se conectará el siguiente nodo
        ps = parseInt(val.split('#')[2], 10); // Puerto del cliente
    }
    else if(index === 3){ // Nombre de la tienda
        store_name = val;
    }
})

// Proceso de recuperación del nodo en caso de una falla
try {
    if(fs.existsSync('recover_'+val+'.txt')){
        // El archivo existe, agarro los datos del archivo y recupero los puertos en el cual estaba levantado
        fs.readFile(store_name+'.txt', 'utf8', function(err, content){
            store_name = content.split('#')[1];
            ps = parseInt(content.split('#')[2], 10);
            pe = parseInt(content.split('#')[3], 10);
            pc = parseInt(content.split('#')[4], 10);
        })
    }
    else {
        pe = ps + 1; 
        pc = pe + 1;
    
        storeData = ip+'#'+store_name+'#'+ps+'#'+pe+'#'+pc;
        fs.writeFile('recover_'+store_name+'.txt', storeData, function(data){}); // Si no existe lo creo nuevo      
    }
} catch (error) { // Ocurre un error al leer el archivo
    pe = ps + 1;
    pc = pe + 1;

    storeData = ip+'#'+store_name+'#'+ps+'#'+pe+'#'+pc;
    fs.writeFile('recover_'+store_name+'.txt', storeData, function(data){}); // Si no existe lo creo nuevo  
}

app.set('port', ps);

/* fs.writeFile('config.json', JSON.stringify(config), function (err) {
    if (err) {
        console.log("Ocurrio un error actualizando el archivo config");
    }
    console.log("El puerto para el cliente en esta tienda es: ", pc);
}) */

var socketInput = require('socket.io').listen(pe); // Abro el socket de salida del servidor
var socketClient = require('socket.io').listen(pc); // Abro el socket del cliente del servidor

//************************* SOCKET PARA ENTRADA DEL SERVIDOR *********************************//
socketInput.sockets.on('connection', function(socket){
    socket.on('add_product', function(data){
        let last_message = null;
        let length = null
        
        if(productList.length !== 0 || productList.length !== 1){
            last_message = data.split(',');
            length = last_message.length - 1;
            last_message = last_message[length];
        }
        else {
            last_message = data;
        }

        // Si la tienda donde se agrega el producto es igual a la data estoy en el nodo de la tienda
        if(last_message.split('#')[0] === store_name){
            socketClient.emit('add_product', 'Su producto ha sido agregado a la tienda ' + store_name+ ' exitosamente.');
        }
        else { // Sino emito la data a los demas nodos.
            productList = data.split(',');
            console.log("Se actualizo la lista ", productList);
            let socketOut = require('socket.io-client');// Abro el socket de salida del servidor
            if(store_name === '3'){
                socketOut = socketOut.connect('http://'+ipToConnect+':'+(pc - 7));
            }
            else {
                socketOut = socketOut.connect('http://'+ipToConnect+':'+(ps + 4));
            }
            socketOut.emit('add_product', productList.toString());
        }
    })
})
//************************* SOCKET PARA ENTRADA DEL SERVIDOR *********************************//

//************************* SOCKET DE SALIDA PARA EL CLIENTE *********************************//
socketClient.on('connection', function(socket){
    // Añadir un nuevo producto de una tienda
    socket.on('add_product', function(data){
        let message = data.split('#')[1] + '#' + data.split('#')[2] + '#' + data.split('#')[3];

        // Ya tiene mas de un producto en inventario la tienda
        if(productList.length !== 0){
            let new_list = [];
            let isFound = false;

            productList.forEach(p => {
                if((p.split('#')[1] === data.split('#')[2]) && (data.split('#')[1] === p.split('#')[0]) ){
                    isFound = true;
                    let sum = parseInt(p.split('#')[2], 10) + parseInt(message.split('#')[2], 10);
                    message = data.split('#')[1] + '#' + data.split('#')[2] + '#' + sum.toString();
                    p = message;
                    new_list.push(p);
                    console.log("Se sumaron " + data.split('#')[3]+ " productos del codigo " + data.split('#')[2] + " en inventario en la " + store_name);
                }
                else {
                    new_list.push(p);
                }
            })

            if(!isFound){ // El producto que se está añadiendo, no está en la lista de inventario de la tienda
                console.log("Se agrego un producto");
                productList.push(message);
            }
            else { // Actualizo el inventario de la tienda
                productList = new_list;
                new_list = [];
                console.log("Se actualizo el inventario del producto con el codigo " + data.split('#')[2]);
            }
        }
        else { // Es el primer producto que se agrega a inventario
            productList.push(message);
            console.log("Se agrego un producto");
        }

        let socketOut = require('socket.io-client');// Abro el socket de salida del servidor
        if(store_name === '3'){
            socketOut = socketOut.connect('http://'+ipToConnect+':'+(pc - 7));
        }
        else {
            socketOut = socketOut.connect('http://'+ipToConnect+':'+(ps + 4));
        }
        socketOut.emit('add_product', productList.toString());
    })
    
    // Listar los productos en inventario de la tienda.
    socket.on('list_product_store', function(data){
        let inventory = [];
        productList.forEach(product => {
            // Verifico si el producto pertenece a la tienda que estoy buscando
            if(data.split('#')[1] === product.split('#')[0]){
                inventory.push(product);
            }
        })
        inventory = inventory.sort(); // Ordeno el arreglo
        socketClient.emit('list_product_store', inventory.toString());
    })

    socket.on('total_product_store', function(data){
        var new_map = new Map();
        productList.forEach(product => {
            let split = product.split('#');
            if(!new_map.get(split[1])){
                new_map.set(split[1],split[2]);
            }else{
                let cantidad = new_map.get(split[1]);
                let updatedCantidad = parseInt(cantidad,10)+parseInt(split[2]);
                new_map.set(split[1],updatedCantidad.toString());
            }
        });
        let serializedString = ""; 
        for (var [clave, valor] of new_map.entries()) {
            serializedString = serializedString+clave+'#'+valor+','
        }
        socketClient.emit('total_product_store', serializedString.substr(0, serializedString.length - 1));
    })

    socket.on('total_store', function(data){
        socketClient.emit('total_store', productList.toString());
    })
})
//************************* SOCKET DE SALIDA PARA EL CLIENTE *********************************//

// Levanto el servidor con Express
server.listen(app.get('port'), function () {
    console.log("Server is running on port:", app.get('port'));
    console.log("El puerto para el cliente en esta tienda es: ", pc);
});