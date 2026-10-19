/* Orbittroniz Neon Offroad settings. Edit these values to tune the game. */
window.ORBITTRONIZ_CONFIG = {
  title: "Orbittroniz Neon Offroad", startingCoins: 0, startingFuel: 100,
  coinReward: 5, fuelPickup: 25, fuelConsumptionPerSecond: 0.42, collisionPenalty: 12,
  cars: [
    {id:"scout",name:"Trail Scout",description:"Balanced starter buggy",price:0,color:0x45d8d1,maxSpeed:145,acceleration:44,handling:1.0},
    {id:"rally",name:"Rally X",description:"Quick response · faster run",price:80,color:0xffb454,maxSpeed:190,acceleration:58,handling:1.12},
    {id:"phantom",name:"Phantom GT",description:"Premium high-speed machine",price:180,color:0x9b8cff,maxSpeed:235,acceleration:68,handling:0.92}
  ],
  terrains: {
    dust:{name:"Dust Run",sky:0x91b5ca,ground:0x9b8061,road:0x6c5b4b,line:0xe6cfa5,fog:0xa9b8bc},
    asphalt:{name:"Neon Highway",sky:0x263e62,ground:0x202c3c,road:0x252a34,line:0x63e9ee,fog:0x53677d},
    snow:{name:"Frost Trail",sky:0xb9d3e6,ground:0xd8e4e9,road:0x657c8c,line:0xf7ffff,fog:0xc7d9e4},
    desert:{name:"Red Desert",sky:0xd99a73,ground:0xa9583c,road:0x704331,line:0xffd08c,fog:0xc98a70}
  }
};
