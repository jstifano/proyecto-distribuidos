// ******* VARIABLES GLOBALES DEL SERVIDOR ********* //
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var fs = require('fs');
var config = require('./config.json');
var ps = null; // Puerto de salida
var pe = null; // Puerto de entrada
var pc = null; // Puerto del cliente
var store_name = "";
var storeData = "";
var productList = [];
var lastNode = false;
var ip = "";
var ipToConnect = "";
// ******* VARIABLES GLOBALES DEL SERVIDOR ********* //

process.argv.forEach(function(val, index, array){
    if(index === 2){ // Nombre de la tienda
        ip = val.split('#')[0];
        ipToConnect = val.split('#')[1];
        ps = parseInt(val.split('#')[2], 10); 
    }
    else if(index === 3){
        store_name = val;
    }
})

try {
    if(fs.existsSync('tienda'+val+'.txt')){
        // El archivo existe, agarro los datos del archivo
        fs.readFile(store_name+'.txt', 'utf8', function(err, content){
            store_name = content.split('#')[0];
            ps = parseInt(content.split('#')[1], 10);
            pe = parseInt(content.split('#')[2], 10);
            pc = parseInt(content.split('#')[3], 10);
        })
    }
} catch (error) { // Si el archivo no existe lo creo.
/*     if(!config.last_port_initiated){
        ps = parseInt(config.port_initial,10) + 1; 
        pe = ps + 1; 
        pc = pe + 1; 
    }
    else {
        ps =  parseInt(config.last_port_initiated,10) + 1; 
        pe = ps + 1; 
        pc = pe + 1;
    } */

    pe = ps + 1;
    pc = pe + 1;

    storeData = ip+'#'+store_name+'#'+ps+'#'+pe+'#'+pc;
    fs.writeFile('tienda'+store_name+'.txt', storeData, function(data){}); // Si no existe lo creo nuevo  

    // Si es el primer nodo que se levanta, registro cual es su entry point
/*     if(config.number_nodes === 0){
        config.first_entry_point = pe;
    }
    config.number_nodes += 1;

    if((config.number_nodes > 2) && lastNode){ // Si es mayor a 2 nodos, debo cerrar el anillo con el primero
        ps = parseInt(config.first_entry_point, 10);
    }   */
}

/* ((config.number_nodes > 2) && lastNode) ? app.set('port', config.last_port_initiated + 1) : app.set('port', ps);
config.last_port_initiated = pc; // Actualizo el ultimo puerto de cliente creado por un nodo */

app.set('port', ps);

fs.writeFile('config.json', JSON.stringify(config), function (err) {
    if (err) {
        console.log("Ocurrio un error actualizando el archivo config");
    }
    console.log("El puerto para el cliente en esta tienda es: ", pc);
})

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
        console.log("Store name", store_name);
        // Si la tienda donde se agrega el producto es igual a la data estoy en el nodo de la tienda
        if(data.split('#')[0] === store_name){
            console.log("Llego aqui");
            socketClient.emit('add_product', 'Su producto ha sido agregado a la tienda ' + store_name+ ' exitosamente.');
        }
        else { // Sino emito la data a los demas nodos.
            productList = data.split();
            console.log("Se actualizo la lista ", productList);
            let socketOut = require('socket.io-client');// Abro el socket de salida del servidor
            if(store_name === '3'){
                console.log("ES LA TIENDA 3 entrooo");
                console.log("ipConnect", ipToConnect);
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
                if(p.split('#')[1] === data.split('#')[2] && data.split('#')[1] === store_name){
                    isFound = true;
                    let sum = parseInt(p.split('#')[2], 10) + parseInt(data.split('#')[3], 10)
                    message = data.split('#')[1] + '#' + data.split('#')[2] + '#' + sum.toString();
                    p = message;
                    console.log("Se sumaron " + data.split('#')[3]+ " productos del codigo " + data.split('#')[2] + " en inventario en la " + store_name);
                }
                new_list.push(p);
            })

            if(!isFound){ // El producto que se está añadiendo, no está en la lista de inventario de la tienda
                console.log("Se agrego un producto");
                productList.push(message);
            }
            else { // Actualizo el inventario de la tienda
                productList = new_list;
                console.log("Se actualizo el inventario del producto con el codigo " + data.split('#')[2]);
            }
        }
        else { // Es el primer producto que se agrega a inventario
            productList.push(message);
            console.log("Se agrego un producto");
        }

        new_list = [];

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
})
//************************* SOCKET DE SALIDA PARA EL CLIENTE *********************************//

// Levanto el servidor con Express
server.listen(app.get('port'), function () {
    console.log("Server is running on port:", app.get('port'));
});