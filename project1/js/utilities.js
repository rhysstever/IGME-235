//Taken from circleBlast
function rectsIntersect(a,b){
    var ab = a.getBounds();
    var bb = b.getBounds();
    return ab.x + ab.width > bb.x && ab.x < bb.x + bb.width && ab.y + ab.height > bb.y && ab.y < bb.y + bb.height;
}

//Taken from circleBlast
function getRandomUnitVector(){
    let x = getRandom(0.5,1);           // a random num from 0.5 to 1
    let y = getRandom(-0.707,0.707);    // a random num from negative root 2 / 2 to pos root 2 / 2
    let length = Math.sqrt(x*x + y*y);
    if(length == 0){ // very unlikely
        x=1; // point right
        y=0;
        length = 1;
    } else{
        x /= length;
        y /= length;
    }

    return {x:x, y:y};
}

function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}