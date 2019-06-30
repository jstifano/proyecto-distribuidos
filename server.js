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
var productList = []; // Lista de productos en inventario
var listSells = []; // Lista de compras
var lastNode = false;
var ip = "";
var ipToConnect = "";
// ******* VARIABLES GLOBALES DEL SERVIDOR ********* //

// Parametros a recibir mediante la consola
process.argv.forEach(function(val, index, array){
    if(index === 2){
        ip = val.split('#')[0]; // Ip la cual se va levantar el nodo 
        ipToConnect = val.split('#')[1]; // Ip a la cual se conectará el siguiente nodo
        ps = parseInt(val.split('#')[2], 10); // Puerto de salida del nodo
    }
    else if(index === 3){ // Nombre de la tienda
        store_name = val;
    }
})

// Proceso de recuperación del nodo en caso de una falla
try {
    if(fs.exists('recover_'+store_name+'.txt')){
        // El archivo existe, agarro los datos del archivo y recupero los puertos en el cual estaba levantado
        fs.readFile('recover_'+store_name+'.txt', 'utf8', function(err, content){
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

    // Hago recover del inventario de la tienda
    if(fs.exists('inventory_'+store_name+'.txt')){
        // El archivo existe, agarro los datos del archivo y leo la lista de productos
        fs.readFile('inventory_'+store_name+'.txt', 'utf8', function(err, content){
            productList = JSON.parse("[" + content + "]");
        })
    }

    // Hago recover de las compras realizadas por los clientes
    if(fs.exists('sells_'+store_name+'.txt')){
        // El archivo existe, agarro los datos del archivo y leo la lista de las compras
        fs.readFile('sells_'+store_name+'.txt', 'utf8', function(err, content){
            listSells = JSON.parse("[" + content + "]");
        })
    }
} catch (error) { // Ocurre un error al leer el archivo
    pe = ps + 1;
    pc = pe + 1;

    storeData = ip+'#'+store_name+'#'+ps+'#'+pe+'#'+pc;
    fs.writeFile('recover_'+store_name+'.txt', storeData, function(data){}); // Si no existe lo creo nuevo 
    fs.writeFile('inventory_'+store_name+'.txt', "", function(data){});
    fs.writeFile('sells_'+store_name+'.txt', "", function(data){});    
}

app.set('port', ps);

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

            fs.writeFile('inventory_'+store_name+'.txt', productList.toString(), function(data){});
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

    socket.on('register_sell', function(data){
        productList = JSON.parse(data.split('/')[0]);
        listSells = JSON.parse(data.split('/')[1]);

        fs.writeFile('inventory_'+store_name+'.txt', productList.toString(), function(data){});
        fs.writeFile('sells_'+store_name+'.txt', listSells.toString(), function(data){});

        if(data.split('/')[0] === store_name){
            socketClient.emit('register_sell', 'Se registro la compra exitosamente.');    
        }
        else {
            let socketOut = require('socket.io-client');// Abro el socket de salida del servidor
            if(store_name === '3'){
                socketOut = socketOut.connect('http://'+ipToConnect+':'+(pc - 7));
            }
            else {
                socketOut = socketOut.connect('http://'+ipToConnect+':'+(ps + 4));
            }
            socketOut.emit('register_sell', data);
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

        fs.writeFile('inventory_'+store_name+'.txt', productList.toString(), function(data){}); 
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
            serializedString = serializedString+clave+'#'+valor+',';
        }
        socketClient.emit('total_product_store', serializedString.substr(0, serializedString.length - 1));
    })

    socket.on('total_store', function(data){
        socketClient.emit('total_store', productList.toString());
    })

    /**************************************************
    * Metodo para registrar una compra en el servidor *
    ***************************************************/
    socket.on('register_sell', function(data){
        let sumInventory = 0;
        let message = data.split('#')[1] + '#' + data.split('#')[2] + '#' + data.split('#')[3] + '#' + data.split('#')[4] + '#' + data.split('#')[5];
        let isInOtherStore = false;

        // Ciclo para obtener la sumatoria de productos en inventario
        productList.forEach(p => {
            if(p.split('#')[1] === data.split('#')[4]){
                sumInventory += parseInt(p.split('#')[2], 10);
            }
        })

        // No hay productos en inventario
        if(sumInventory === 0){
            socketClient.emit('register_sell', 'No hay productos con el código '+ data.split('#')[4] + 'en inventario.');       
        }
        else {
            let newList = [];
            productList.forEach(p => {
                if(!isInOtherStore){
                    if(p.split('#')[0] === data.split('#')[3] && p.split('#')[1] === data.split('#')[4]){
                        // No hay productos del cual puedo comprar en la tienda, voy a inventario
                        if(parseInt(p.split('#')[2], 10) < parseInt(data.split('#')[5], 10) ){ 
                            isInOtherStore = true; // Debo restar el inventario en otra tienda    
                        }
                        else { // Hay productos en la tienda, puedo comprar y registrarla
                            listSells.push(message);
                            console.log("Se registro la compra.");
                            fs.writeFile('sells_'+store_name+'.txt', listSells.toString(), function(data){});
                            // Resto el inventario de la tienda
                            p = p.split('#')[0] + '#' + p.split('#')[1] + '#' + ( parseInt(p.split('#')[2], 10) - parseInt(data.split('#')[5], 10) );      
                        }    
                    }
                }
                newList.push(p);
            })

            if(isInOtherStore){
                let otherList = [];
                productList.forEach(p => {
                    if(p.split('#')[0] !== data.split('#')[3] && p.split('#')[1] === data.split('#')[4]){
                        // Hay productos en la nueva tienda
                        if(parseInt(p.split('#')[2], 10) > 0 ){ 
                            listSells.push(message);
                            console.log("Se registro la compra.");
                            fs.writeFile('sells_'+store_name+'.txt', listSells.toString(), function(data){});
                            // Resto el inventario de la tienda
                            p = p.split('#')[0] + '#' + p.split('#')[1] + '#' + ( parseInt(p.split('#')[2], 10) - parseInt(data.split('#')[5], 10) );    
                        } 
                    } 
                    otherList.push(p);
                })

                productList = otherList;
                fs.writeFile('inventory_'+store_name+'.txt', productList.toString(), function(data){});
                let socketOut = require('socket.io-client');// Abro el socket de salida del servidor
                if(store_name === '3'){
                    socketOut = socketOut.connect('http://'+ipToConnect+':'+(pc - 7));
                }
                else {
                    socketOut = socketOut.connect('http://'+ipToConnect+':'+(ps + 4));
                }
                socketOut.emit('register_sell', data.split('#')[3]+'/'+productList.toString()+'/'+listSells.toString());    
            }
            else {
                productList = newList;
                fs.writeFile('inventory_'+store_name+'.txt', productList.toString(), function(data){});
                let socketOut = require('socket.io-client');// Abro el socket de salida del servidor
                if(store_name === '3'){
                    socketOut = socketOut.connect('http://'+ipToConnect+':'+(pc - 7));
                }
                else {
                    socketOut = socketOut.connect('http://'+ipToConnect+':'+(ps + 4));
                }
                socketOut.emit('register_sell', data.split('#')[3]+'/'+productList.toString()+'/'+listSells.toString());
            }  
        }
    })
})
//************************* SOCKET DE SALIDA PARA EL CLIENTE *********************************//

// Levanto el servidor con Express
server.listen(app.get('port'), function () {
    console.log("Server is running on port:", app.get('port'));
    console.log("El puerto para el cliente en esta tienda es: ", pc);
});