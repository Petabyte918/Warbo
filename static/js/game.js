var tileWidth = 70;
var tileHeight = tileWidth / 2;

require([
        'jsiso/canvas/Control',
        'jsiso/canvas/Input',
        'jsiso/img/load',
        'jsiso/json/load',
        'jsiso/tile/Field',
        'jsiso/pathfind/pathfind',
        'jsiso/particles/EffectLoader',
        'jsiso/utils'
    ],
    function(CanvasControl, CanvasInput, imgLoader, jsonLoader, TileField, pathfind) {

        // -- FPS --------------------------------
        window.requestAnimFrame = (function() {
            return window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function(callback) {
                    window.setTimeout(callback, 1000 / 60);
                };
        })();
        // ---------------------------------------


        function launch() {

            jsonLoader(['../static/json/map.json', '../static/json/imageFiles.json']).then(function(jsonResponse) {
                var imgs = [];
                for (var property in jsonResponse[0].tilesets[0].tiles) {
                    if (jsonResponse[0].tilesets[0].tiles.hasOwnProperty(property)) {
                        imgs.push(jsonResponse[0].tilesets[0].tiles[property].image);
                    }
                }

                var images = [{
                    graphics: imgs,
                }, {
                    graphics: jsonResponse[1].playerImages
                }];


                imgLoader(images).then(function(imgResponse) {
                    var finalMap = [],
                        finalHeight = [],
                        objectMap = [];
                    var tempMap = [],
                        tempHeight = [],
                        tempObjects = [];
                    var j = 0;
                    for (var i = 0; i < jsonResponse[0].layers[0].data.length; i++) {
                        for (var z = 1; z < jsonResponse[0].layers.length - 1; z++) {
                            if (jsonResponse[0].layers[z].data[i] !== 0) {
                                if (tempMap[j] === undefined) {
                                    tempMap.push(jsonResponse[0].layers[z].data[i] - 1);
                                    tempHeight.push(z);
                                } else {
                                    tempMap[j] = jsonResponse[0].layers[z].data[i] - 1;
                                    tempHeight[j] = z;
                                }
                            }
                        }
                        if (tempMap[j] === undefined) {
                            tempMap.push(jsonResponse[0].layers[0].data[i] - 1);
                            tempHeight.push(0);
                        }
                        tempObjects.push(jsonResponse[0].layers[jsonResponse[0].layers.length - 1].data[i]);
                        j++;
                        if ((i + 1) % 50 === 0 && i !== 0) {
                            finalMap.push(tempMap);
                            finalHeight.push(tempHeight);
                            objectMap.push(tempObjects);
                            tempMap = [];
                            tempHeight = [];
                            tempObjects = [];
                            j = 0;
                        }
                    }
                    var tileEngine = new main(0, 0, 15, 15, imgResponse[1]);
                    tileEngine.init([{
                        zIndex: 0,
                        title: "Ground Layer",
                        layout: finalMap,
                        graphics: imgResponse[0].files,
                        graphicsDictionary: imgResponse[0].dictionary,
                        applyInteractions: true,
                        shadowDistance: {
                            color: '0,0,33',
                            distance: 4,
                            darkness: 3
                        },
                        shadow: {
                            offset: tileHeight,
                            verticalColor: '(5, 5, 30, 0.4)',
                            horizontalColor: '(6, 5, 50, 0.5)'
                        },
                        /*lightMap: [
                        	[5, 5, 4, 1],
                        	[20, 20, 4, 1]
                        ],*/
                        heightMap: {
                            map: finalHeight,
                            offset: 0,
                            heightTile: imgResponse[0].files["height.png"]
                        },
                        tileHeight: tileHeight,
                        tileWidth: tileWidth
                    }, {
                        zIndex: 1,
                        title: "Object Layer",
                        layout: objectMap,
                        graphics: imgResponse[0].files,
                        graphicsDictionary: imgResponse[0].dictionary,
                        zeroIsBlank: true,
                        applyInteractions: true,
                        alphaWhenFocusBehind: {
                            objectApplied: imgResponse[1].files["main.png"],
                            apply: true
                        },
                        shadowDistance: {
                            color: false,
                            distance: 4,
                            darkness: 2
                        },
                        //particleMap: jsonResponse[0].particles,
                        /*lightMap: [
                        	[5, 5, 4, 1],
                        	[20, 20, 4, 1]
                        ],*/
                        heightMap: {
                            map: finalHeight,
                            offset: tileHeight,
                            heightMapOnTop: true
                        },
                        tileHeight: tileHeight,
                        tileWidth: tileWidth
                    }]);
                });
            });
        }


        function main(x, y, xrange, yrange, playerImages) {

            var player = {
                image: playerImages.files["main.png"],
                xPos: 7,
                yPos: 7
            };
            var enemy = [{
                id: 0,
                image: playerImages.files["enemy1.png"],
                xPos: 0,
                yPos: 0
            }, {
                id: 1,
                image: playerImages.files["enemy1.png"],
                xPos: 0,
                yPos: 0
            }, {
                id: 2,
                image: playerImages.files["enemy1.png"],
                xPos: 0,
                yPos: 0
            }, {
                id: 3,
                image: playerImages.files["enemy1.png"],
                xPos: 0,
                yPos: 0
            }];


            var mapLayers = [];
            var tile_coordinates = {};
            var startY = y;
            var startX = x;
            var rangeX = xrange;
            var rangeY = yrange;
            var calculatePaths = 0;



            var context = CanvasControl.create("canvas_id", window.innerWidth, window.innerHeight, {
                background: "#000022",
                display: "block",
                marginLeft: "auto",
                marginRight: "auto",
            });
            //CanvasControl.fullScreen();



            var input = new CanvasInput(document, CanvasControl());
            input.mouse_action(function(coords) {
                tile_coordinates = mapLayers[0].getXYCoords(coords.x, coords.y);
                if (coords.x)
                    var height = mapLayers[0].getHeightMapTile(tile_coordinates.x, tile_coordinates.y);
                tile_coordinates.x = tile_coordinates.x + height - 1;
                tile_coordinates.y = tile_coordinates.y + height - 1;
                mapLayers[0].applyFocus(tile_coordinates.x, tile_coordinates.y);
                console.log(tile_coordinates.x);
                // console.log('X: '+tile_coordinates.x+' - '+player.xPos);
                // console.log('Y: '+tile_coordinates.y+' - '+player.yPos);
                /*pathfind(player.id, [player.xPos, player.yPos], [tile_coordinates.x, tile_coordinates.y], mapLayers[0].getLayout(), true, true).then(function(data) {
                	var i = 0;
                	var move = setInterval(function() {
                		if (data.length > 0 && data[i] !== undefined) {
                			player.xPos = data[i].x;
                			player.yPos = data[i].y;
                			if (startX > 0 && player.yPos <= mapLayers[0].getLayout().length - 1 - rangeY / 2) {
                				mapLayers.map(function(layer) {
                					layer.move("down");
                				});
                				startX--;
                			} else if (startY + rangeY < mapLayers[0].getLayout().length && player.xPos >= 0 + 1 + rangeX / 2) {
                				mapLayers.map(function(layer) {
                					layer.move("left");
                				});
                				startY++;
                			} else if (startX + rangeX < mapLayers[0].getLayout().length && player.yPos >= 0 + 1 + rangeY / 2) {
                				mapLayers.map(function(layer) {
                					layer.move("right");
                				});
                				startX++;
                			} else if (startY > 0 && player.xPos <= mapLayers[0].getLayout().length - 1 - rangeX / 2) {
                				mapLayers.map(function(layer) {
                					layer.move("up");
                				});
                				startY--;
                			}
                			i++;
                			if (i == data.length) {
                				clearInterval(move);
                				move = undefined;
                			}
                		}
                	}, 100);

                });*/
                //mapLayers[0].setHeightmapTile(tile_coordinates.x, tile_coordinates.y, mapLayers[0].getHeightMapTile(tile_coordinates.x, tile_coordinates.y) + 1); // Increase heightmap tile
                //console.log(mapLayers[0].getHeightMapTile(tile_coordinates.x, tile_coordinates.y));
                //mapLayers[1].setHeightmapTile(tile_coordinates.x, tile_coordinates.y, mapLayers[1].getHeightMapTile(tile_coordinates.x, tile_coordinates.y) + 1);
                mapLayers[1].setTile(tile_coordinates.x, tile_coordinates.y, 3); // Force the chaning of tile graphic
                //console.log(tile_coordinates);
            });
            /*input.mouse_move(function(coords) {
            	//tile_coordinates = mapLayers[0].applyMouseFocus(coords.x, coords.y);
            	mapLayers.map(function(layer) {
            		tile_coordinates = layer.applyMouseFocus(coords.x, coords.y); // Apply mouse rollover via mouse location X & Y
            	});
            });*/
            input.keyboard(function(key, pressed) {
                if (pressed) {
                    switch (key) {
                        case 38:
                            if (Number(mapLayers[1].getTile([player.xPos], [player.yPos - 1])) === 0) {
                                player.yPos--;
                                mapLayers[1].applyFocus(player.xPos, player.yPos);
                                if ( /*startX > 0 && */ player.yPos <= mapLayers[0].getLayout().length - 1 - rangeY / 2) {
                                    mapLayers.map(function(layer) {
                                        layer.move("down");
                                    });
                                    startX--;
                                }
                            }
                            break;
                        case 39:
                            if (Number(mapLayers[1].getTile([player.xPos + 1], [player.yPos])) === 0) {
                                player.xPos++;
                                mapLayers[1].applyFocus(player.xPos, player.yPos);
                                if (startY + rangeY < mapLayers[0].getLayout().length /*&& player.xPos >= 0 + 1 + rangeX / 2*/ ) {
                                    mapLayers.map(function(layer) {
                                        layer.move("left");
                                    });
                                    startY++;
                                }
                            }
                            break;
                        case 40:
                            if (Number(mapLayers[1].getTile([player.xPos], [player.yPos + 1])) === 0) {
                                player.yPos++;
                                mapLayers[1].applyFocus(player.xPos, player.yPos);
                                if (startX + rangeX < mapLayers[0].getLayout().length /*&& player.yPos >= 0 + 1 + rangeY / 2*/ ) {
                                    mapLayers.map(function(layer) {
                                        layer.move("right");
                                    });
                                    startX++;
                                }
                            }
                            break;
                        case 37:
                            if (Number(mapLayers[1].getTile([player.xPos - 1], [player.yPos])) === 0) {
                                player.xPos--;
                                mapLayers[1].applyFocus(player.xPos, player.yPos);
                                if ( /*startY > 0 && */ player.xPos <= mapLayers[0].getLayout().length - 1 - rangeX / 2) {
                                    mapLayers.map(function(layer) {
                                        layer.move("up");
                                    });
                                    startY--;
                                }
                            }
                            break;
                        case 49:
                            mapLayers.map(function(layer) {
                                layer.toggleGraphicsHide(true);
                                layer.toggleHeightShadow(true);
                            });
                            break;
                        case 50:
                            mapLayers.map(function(layer) {
                                layer.toggleGraphicsHide(false);
                                layer.toggleHeightShadow(false);
                            });
                            break;
                    }
                }
            });

            function draw() {
                context.clearRect(0, 0, CanvasControl().width, CanvasControl().height);
                calculatePaths++;
                if (calculatePaths === 100) {
                    enemy.map(function(e) {
                        pathfind(e.id, [e.xPos, e.yPos], [player.xPos, player.yPos], mapLayers[1].getLayout(), true, true).then(function(data) {
                            if (data.length > 0 && data[1] !== undefined) {
                                e.xPos = data[1].x;
                                e.yPos = data[1].y;
                            }
                        });
                    });
                    calculatePaths = 0;
                }
                for (var i = startY, n = startY + rangeY; i < n; i++) {
                    for (var j = startX, h = startX + rangeX; j < h; j++) {
                        mapLayers.map(function(layer) {
                            layer.setLight(player.xPos, player.yPos);
                            if (i === player.xPos && j === player.yPos && layer.getTitle() === "Object Layer") {
                                layer.draw(i, j, player.image);
                            } else {
                                layer.draw(i, j);
                            }
                            enemy.map(function(e) {
                                if (i === e.xPos && j === e.yPos && layer.getTitle() === "Object Layer") {
                                    layer.draw(i, j, e.image);
                                }
                            });
                        });
                    }
                }
                // rain.Draw(CanvasControl().width / 4, 0);
                requestAnimFrame(draw);
            }

            return {
                init: function(layers) {
                    for (var i = 0; i < 0 + layers.length; i++) {
                        mapLayers[i] = new TileField(context, CanvasControl().height, CanvasControl().width);
                        mapLayers[i].setup(layers[i]);
                        mapLayers[i].flip("horizontal");
                        mapLayers[i].rotate("left");
                        mapLayers[i].align("h-center", CanvasControl().width, xrange, 0);
                        mapLayers[i].align("v-center", CanvasControl().height, yrange, 0);
                    }
                    // rain = new EffectLoader().getEffect("rain", context, utils.range(-100, CanvasControl().height), utils.range(-100, CanvasControl().width));
                    draw();
                }
            }
        }
        launch();
    });