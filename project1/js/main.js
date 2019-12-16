"use strict";
const app = new PIXI.Application(1200,600);
document.querySelector('section').append(app.view);

let background;

//Track the size of our app, the stage itself, and a block of colors
const sceneWidth = app.view.width;
const sceneHeight = app.view.height;
let colors = [];
let stage;
let paused;

//Lots of variables: each of the scenes, all of the labels, the buttons, and who won
let startScene, gameScene, gameOverScene;
let titleLabel, startLabel, p1InstructionLabel, p2InstructionLabel, p1ScoreLabel, p2ScoreLabel, pauseLabel, pauseLabel2, gameOverScoreLabel, gameOverText;
let startButton, playAgainButton, exitButton;
let winner;

//Media variables
let brickSound, playerSound, goalSound, music;
let backgroundImage;

//Setup event
PIXI.loader
  .add(["../images/Outrun.png"], ["../fonts/Outrun2.xml"])
  .load(setup);

//Track all the active components
let player1, player2, ball1, ball2;
let bricks = [];
let balls = [];

function setup() {
    //Setup colors and the pause function
    addColors();
    paused = false;

    //Setup the background from the PIXI loader
    background = new PIXI.Sprite(PIXI.loader.resources["../images/Outrun.png"].texture);

    background.position.x = 0;
    background.position.y = 0;
    background.width = sceneWidth;
    background.height = sceneHeight;

    stage = app.stage;
    stage.addChild(background);

    // #1 - Create the `start` scene
    startScene = new PIXI.Container();
    stage.addChild(startScene);
    startScene.visible = true;
	
    // #2 - Create the main `game` scene and make it invisible
    gameScene = new PIXI.Container();
    gameScene.visible = false;
    stage.addChild(gameScene);

    // #3 - Create the `gameOver` scene and make it invisible
    gameOverScene = new PIXI.Container();
    gameOverScene.visible = false;
    stage.addChild(gameOverScene);

    // #4 - Create players
    player1 = new Player(0xFFFFFF, 0, 0, 20, 80, 1, 5, 0);
    player2 = new Player(0xFFFFFF, 0, 0, 20, 80, 1, 5, 0);
    gameScene.addChild(player1);
    gameScene.addChild(player2);

    // #5 - Create labels for all 3 scenes
    createLabelsAndButtons();

    // #6 - Add sounds
    brickSound = new Howl({
        src: ["../sounds/ding1.wav"]
    });
    playerSound = new Howl({
        src: ["../sounds/ding2.wav"]
    });
    goalSound = new Howl({
        src: ["../sounds/GoalExplosion.mp3"]
    });
    music = new Howl({
        src: ["../sounds/outrunMusic.mp3"]
    });

    // #7 - Spawn Balls
    ball1 = new Ball(0xFF1690, 0x14dbfa, 0, 0, 5, 200, true);
    ball1.changeAng(-ball1.fwd.x, ball1.fwd.y);
    ball2 = new Ball(0xFF1690, 0x14dbfa, 0, 0, 5, 200, false);
    balls.push(ball1);
    balls.push(ball2);
    gameScene.addChild(ball1);
    gameScene.addChild(ball2);

    // #8 - run the gameloop
    app.ticker.add(gameLoop);
}

function gameLoop(){
    //Spawn the pause labels before breaking
    if (paused){
        pauseLabel.visible = true;
        pauseLabel2.visible = true;
        return;
    } 

    if(!gameScene.visible) return;

    // Removes the pause label if not being used
    pauseLabel.visible = false;
    pauseLabel2.visible = false;
	
	// #1 - Calculate "delta time"
	let dt = 1/app.ticker.FPS;
    if (dt > 1/12) dt=1/12;

    // #2 - Move players with multi-key input
    checkKeys();
    
    // #3 - Bounds checking
    player1.bounds();
    player2.bounds();

    // #4 - Move Balls
    for(let b of balls){
        b.move(dt);

        // Ball hitting top and bottom "walls"
        // Will reflect and keep going
        if(b.y <= b.radius || b.y >= sceneHeight - b.radius){
            b.reflectY();
            b.move(dt);
        }

        // Ball hitting either side "goal"
        // Will be removed from the scene
        if(b.x <= -100 || b.x >= sceneWidth){
            let ball;
            if(b.x >= sceneWidth){
                increaseScoreBy(100, player1);
                ball = new Ball(0xFF1690, 0x14dbfa, 0, 0, 5, 200, true);
                gameScene.addChild(ball);
                ball.x = sceneWidth / 3 + 25;
                ball.y = sceneHeight / 2;
                ball.fwd = getRandomUnitVector();
                ball.fwd.x = -ball.fwd.x;
                balls.push(ball);
            }               
            else{
                increaseScoreBy(100, player2);
                ball = new Ball(0xFF1690, 0x14dbfa, 0, 0, 5, 200, false);
                ball.x = 2 * sceneWidth / 3 - 25;
                ball.y = sceneHeight / 2;
                ball.fwd = getRandomUnitVector();
                gameScene.addChild(ball);
                balls.push(ball);
            }
                
            goalSound.play();
            gameScene.removeChild(b);
            b.isAlive = false;
        }
    }

    // #5 - Collision Checks
    collisionDetection();

    // #6 - Checking Brick health, removing them if health = 0
    for(let b of bricks){
        if(b.health <= 0){
            gameScene.removeChild(b);
            b.isAlive = false;
        }
    }

    //If there aren't any bricks, spawn some
    if(bricks.length == 0){
        buildBricks();
    }
    
    // #7 - Clean-up
    balls = balls.filter(b=>b.isAlive);
    bricks = bricks.filter(b=>b.isAlive);

    //Handle game over logic
    if(player1.score >= 500 || player2.score >= 500){
        player1.score >= 500 ? gameOverText.text = "Victory for Player 1!" : gameOverText.text = "Victory for Player 2!"
        gameScene.visible = false;
        gameOverScene.visible = true;
        gameOverScoreLabel.text = "Final Score: " + player1.score + " to " + player2.score;
    }
}

function addColors(){
    // Dark Purple
    colors.push(0x0D0221);

    // Medium purple
    colors.push(0x540D6E);

    // Bright Blue
    colors.push(0x2DE2E6);

    // Bright Red
    colors.push(0xFF3864);

    // Orange
    colors.push(0xFF6C11);
}

function randColor(){
    return colors[parseInt(Math.random() * 5)];
}

function checkKeys(){
    //keys from the keys class
    for(let i = 0; i < keys.length; i++){
        if(keys[i].isDown) {         
            switch(i){
                case 0:
                    player1.y -= player1.speed;
                    break;
                case 1:
                    player1.y += player1.speed;
                    break;
                case 2:
                    player2.y -= player2.speed;
                    break;
                case 3:
                    player2.y += player2.speed;
                    break;
            }
        }

        keys[4].press = () => {
            paused = !paused;
        }
    }
}

function createLabelsAndButtons(){
    // Cyberpunk style font, like text
    let buttonStyle = new PIXI.TextStyle({
        fill: 0xFF3864,
        fontSize: 48,
        fontFamily: "outrun, sans-serif",
        fontStyle: "italic"
    });
    let textStyle = new PIXI.TextStyle({
        fill: 0xFF6C11,
        fontSize: 18,
        fontFamily: "outrun, sans-serif",
        stroke: 0x0D0221,
        strokeThickness: 4
    });

    titleLabel = new PIXI.Text("Brick Pong");
    titleLabel.style = new PIXI.TextStyle({
        fill: 0x2DE2E6,
        fontSize: 72,
        fontFamily: 'outrun, sans-serif',
        stroke: 0xFF3864,
        strokeThickness: 6
    });
    titleLabel.x = (sceneWidth - titleLabel.width) / 2;
    titleLabel.y = sceneHeight / 4 - titleLabel.height;
    startScene.addChild(titleLabel);

    // Controls for each player
    p1InstructionLabel = new PIXI.Text("Player 1: Use W/S to move Up/Down");
    p1InstructionLabel.style = new PIXI.TextStyle({
        fill: 0x2DE2E6,
        fontSize: 32,
        fontFamily: 'outrun, sans-serif'
    });
    p1InstructionLabel.x = (sceneWidth - p1InstructionLabel.width) / 2;
    p1InstructionLabel.y = sceneHeight - 125;
    startScene.addChild(p1InstructionLabel);

    p2InstructionLabel = new PIXI.Text("Player 2: Use the Up/Down arrow keys to move Up/Down");
    p2InstructionLabel.style = new PIXI.TextStyle({
        fill: 0x2DE2E6,
        fontSize: 32,
        fontFamily: 'outrun, sans-serif'
    });
    p2InstructionLabel.x = (sceneWidth - p2InstructionLabel.width) / 2;
    p2InstructionLabel.y = sceneHeight - 75;
    startScene.addChild(p2InstructionLabel);

    let startLabel = new PIXI.Text("Made for 2 players!");
    startLabel.style = new PIXI.TextStyle({
        fill: 0xFF6C11,
        fontSize: 32,
        fontFamily: "outrun, sans-serif",
        fontStyle: "italic",
        stroke: 0x540D6E,
        strokeThickness: 6
    });
    startLabel.x = (sceneWidth - startLabel.width) / 2;
    startLabel.y = 300;
    startScene.addChild(startLabel);

    startButton = new PIXI.Text("Start Game");
    startButton.style = buttonStyle;
    startButton.x = (sceneWidth - startButton.width) / 2;
    startButton.y = 3 * (sceneHeight / 4) - startButton.height;
    startButton.interactive = true;
    startButton.buttonMode = true;
    startButton.on("pointerup", startGame);
    startButton.on("pointerover", e=>e.target.alpha = 0.7);
    startButton.on("pointerout", e=>e.currentTarget.alpha = 1.0);
    startScene.addChild(startButton);

    p1ScoreLabel = new PIXI.Text();
    p1ScoreLabel.style = textStyle;
    p1ScoreLabel.x = 10;
    p1ScoreLabel.y = 10;
    gameScene.addChild(p1ScoreLabel);
    increaseScoreBy(0, player1);

    p2ScoreLabel = new PIXI.Text();
    p2ScoreLabel.style = textStyle;
    p2ScoreLabel.x = sceneWidth - 80 - p2ScoreLabel.width;
    p2ScoreLabel.y = 10;
    gameScene.addChild(p2ScoreLabel);
    increaseScoreBy(0, player2);

    let pauseTextStyle = new PIXI.TextStyle({
        fill: 0x2DE2E6,
        fontSize: 30,
        fontFamily: "outrun, sans-serif",
        stroke: 0xFF3864,
        strokeThickness: 6
    });

    pauseLabel = new PIXI.Text("Game Paused");
    pauseLabel.style = pauseTextStyle;
    pauseLabel.parent = pauseLabel;
    pauseLabel.x = 125;
    pauseLabel.y = 200;
    pauseLabel.visible = true;
    gameScene.addChild(pauseLabel);

    pauseLabel2 = new PIXI.Text("Game Paused");
    pauseLabel2.style = pauseTextStyle;
    pauseLabel2.parent = pauseLabel2;
    // pauseLabel.x = (sceneWidth - pauseLabel.width) / 2;
    pauseLabel2.x = sceneWidth - 300;
    pauseLabel2.y = 200;
    pauseLabel2.visible = true;
    gameScene.addChild(pauseLabel2);
    
    gameOverText = new PIXI.Text("Victory for {winner}!");
    gameOverText.style = new PIXI.TextStyle({
        fill: 0x2DE2E6,
        fontSize: 48,
        fontFamily: "outrun, sans-serif",
        stroke: 0xFF3864,
        strokeThickness: 6
    });
    gameOverText.x = (sceneWidth / 2) - (gameOverText.width / 2);
    gameOverText.y = sceneHeight/2 - 160;
    gameOverScene.addChild(gameOverText);

    //Same as winner text when game is over
    gameOverScoreLabel = new PIXI.Text("Final score: player1.score to player2.score");
    gameOverScoreLabel.style = new PIXI.TextStyle({
        fill: 0x2DE2E6,
        fontSize: 48,
        fontFamily: "outrun, sans-serif",
        stroke: 0xFF3864,
        strokeThickness: 6
    });
    gameOverScoreLabel.x = (sceneWidth / 2) - 250;
    gameOverScoreLabel.y = sceneHeight - 300;
    gameOverScene.addChild(gameOverScoreLabel);

    playAgainButton = new PIXI.Text("Play Again?");
    playAgainButton.style = new PIXI.TextStyle({
        fill: 0x2DE2E6,
        fontSize: 48,
        fontFamily: "outrun, sans-serif",
        fontStyle: "italic",
        stroke: 0x540D6E,
        strokeThickness: 6
    });;
    playAgainButton.x = 3 * (sceneWidth / 4) - playAgainButton.width;
    playAgainButton.y = sceneHeight - 100;
    playAgainButton.interactive = true;
    playAgainButton.buttonMode = true;
    playAgainButton.on("pointerup",startGame);
    playAgainButton.on("pointerover",e=>e.target.alpha = 0.7);
    playAgainButton.on("pointerout", e=>e.currentTarget.alpha = 1.0);
    gameOverScene.addChild(playAgainButton);

    // Make button back to main menu
    exitButton = new PIXI.Text("Escape");
    exitButton.style = new PIXI.TextStyle({
        fill: 0x2DE2E6,
        fontSize: 48,
        fontFamily: "outrun, sans-serif",
        fontStyle: "italic",
        stroke: 0x540D6E,
        strokeThickness: 6
    });
    exitButton.x = (sceneWidth / 4);
    exitButton.y = sceneHeight - 100;
    exitButton.interactive = true;
    exitButton.buttonMode = true;
    exitButton.on("pointerup",mainmenu); // startGame is a function reference
    exitButton.on('pointerover',e=>e.target.alpha = 0.7); // concise arrow function with no brackets
    exitButton.on('pointerout',e=>e.currentTarget.alpha = 1.0); // ditto
    gameOverScene.addChild(exitButton);
}

function startGame(){
    //Set the game scene to active
    startScene.visible = false;
    gameOverScene.visible = false;
    gameScene.visible = true;

    //Spawn players
    player1.x = 50;
    player1.y = sceneHeight / 2;
    player2.x = sceneWidth - 50 - player2.width;
    player2.y = sceneHeight / 2;

    //Spawn balls
    ball1.x = sceneWidth / 3 + 25;
    ball1.y = sceneHeight / 2;
    ball2.x = 2 * sceneWidth / 3 - 25;
    ball2.y = sceneHeight / 2;

    //Check if any bricks are stored and need to be removed
    for(let b of bricks){
        if(b != "0"){
            b.isAlive = false;
            gameScene.removeChild(b);
        }
    }
    
    music.play();

    //reset bricks and score
    buildBricks();

    player1.score = 0;
    player2.score = 0;
    increaseScoreBy(0, player1);
    increaseScoreBy(0, player2);
}

function mainmenu(){
    location.reload();
}

function buildBricks(){
    //Loop through to create 18 bricks
    bricks = [];
    let height = 100;
    let width = 100;
    let xStart = (sceneWidth / 4) - (width * 3)/4;
    for(let i = 0; i < 3; i++){
        for(let j = 0; j < 6; j++){            
            let b = new Brick(randColor(), xStart + (i * height/2), (j * width/2), width, height, 1, 2);
            bricks.push(b);
            gameScene.addChild(b);
        }
    }   
}

function hitBrick(brick, ball){
    //Handle adding score to each different player
    brick.health = brick.health - 1;
    brick.hit();

    brickSound.play();

    if(ball.p1LastHit)
        increaseScoreBy(10, player1);
    else 
        increaseScoreBy(10, player2);
}

function increaseScoreBy(value, player){
    //Adds the score directly to the appropriate player object
    player.score += value;

    if(player == player1)
        p1ScoreLabel.text = `Score:  ${player.score}`;
    else
        p2ScoreLabel.text = `Score:  ${player.score}`;
}

function collisionDetection(){
    //Outer loop checks both bricks and players
    for(let ball of balls){
        for(let brick of bricks){
            if(rectsIntersect(ball, brick)){
                hitBrick(brick, ball);

                let xCond1 = ball.x / 2 > brick.x;
                let xCond2 = ball.x / 2 < brick.x + brick.width;
                let yCond1 = ball.y / 2 > brick.y;
                let yCond2 = ball.y / 2 < brick.y + brick.height;

                // Debug console.logs
                // console.log("Hit");
                // console.log("xCond1: " + xCond1);
                // console.log("xCond2: " + xCond2);
                // console.log("yCond1: " + yCond1);
                // console.log("yCond2: " + yCond2);

                // console.log("Brick X: " + brick.x);
                // console.log("Ball X: " + (ball.x / 2));
                // console.log("Brick xSum: " + (brick.x + brick.width));
                // console.log("Brick Y: " + brick.y);
                // console.log("Ball Y: " + (ball.y / 2));
                // console.log("Brick ySum: " + (brick.y + brick.height));                

                
                // The ball is to the left or right of the brick
                if(yCond1 && yCond2){
                    ball.reflectX();
                    ball.move();
                }
                // The ball is above or below the brick
                else if(xCond1 && xCond2){
                    ball.reflectY();
                    ball.move();
                }
            }
        }

        // Ball-bumper collisions
        if(rectsIntersect(ball, player1)){
            ball.p1LastHit = true;
            playerSound.play();
            changeBallAngle(ball, player1);
        }
        else if(rectsIntersect(ball, player2)){
            ball.p1LastHit = false;
            playerSound.play();
            changeBallAngle(ball, player2);
        }
    }  
}

function changeBallAngle(ball, player){
    // Finds the unit diff between the center of the 
    // bumper and the ball when they collided
    let diff = ball.y - (player.y + player.height / 2);
    
    // Finds the new angle 
    let angle = (diff / (player.height / 2)) * 45;

    // Creates new x/y components for the ball's direction
    let newX = Math.cos(angle);
    let newY = Math.sin(angle);

    if(player == player1)
        newX = -newX;

    // Applies it to the ball
    ball.changeAng(newX, newY);
}