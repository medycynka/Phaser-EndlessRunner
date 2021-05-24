let game;

let gameOptions = {
    platformSpeedRange: 5,
    spawnRange: [100, 300],
    platformSizeRange: [100, 300],
    platformHeightRange: [-10, 10],
    platformHeightScale: 10,
    platformVerticalLimit: [0.4, 0.8],
    playerGravity: 900,
    jumpForce: 400,
    playerStartPosition: 200,
    jumps: 2,
    coinPercentage: 25,
    firePercentage: 10
}

window.onload = function() {
    let gameConfig = {
        type: Phaser.AUTO,
        width: 1334,
        height: 750,
        scene: [preloadGame, playGame],
        backgroundColor: 0x87CEEB,

        physics: {
            default: "arcade"
        }
    }
    game = new Phaser.Game(gameConfig);
    window.focus();
    resize();
    window.addEventListener("resize", resize, false);
}

class preloadGame extends Phaser.Scene{
    constructor() {
        super("PreloadGame");
    }

    preload(){
        this.load.image("platform", "platform.png")
        this.load.spritesheet("player", "player.png", {
            frameWidth: 24,
            frameHeight: 48
        })
        this.load.spritesheet("coin", "coin.png", {
            frameWidth: 20,
            frameHeight: 20
        })
        this.load.spritesheet("fire", "fire.png", {
            frameWidth: 40,
            frameHeight: 70
        });
    }

    create(){
        this.anims.create({
            key: "run",
            frames: this.anims.generateFrameNumbers("player", {
                start: 0,
                end: 1
            }),
            frameRate: 8,
            repeat: -1
        })
        this.anims.create({
            key: "rotate",
            frames: this.anims.generateFrameNumbers("coin", {
                start: 0,
                end: 5
            }),
            frameRate: 15,
            yoyo: true,
            repeat: -1
        })
        this.anims.create({
            key: "burn",
            frames: this.anims.generateFrameNumbers("fire", {
                start: 0,
                end: 4
            }),
            frameRate: 15,
            repeat: -1
        });
        this.scene.start("PlayGame")
    }
}

class playGame extends Phaser.Scene{
    constructor(){
        super("PlayGame")
    }

    create(){
        this.addedPlatforms = 0
        this.platformGroup = this.add.group({
            removeCallback: function(platform){
                platform.scene.platformPool.add(platform)
            }
        })
        this.platformPool = this.add.group({
            removeCallback: function(platform){
                platform.scene.platformGroup.add(platform)
            }
        })

        this.coinGroup = this.add.group({
            removeCallback: function(coin){
                coin.scene.coinPool.add(coin)
            }
        })
        this.coinPool = this.add.group({
            removeCallback: function(coin){
                coin.scene.coinGroup.add(coin)
            }
        })

        this.fireGroup = this.add.group({
            removeCallback: function(fire){
                fire.scene.firePool.add(fire)
            }
        });
        this.firePool = this.add.group({
            removeCallback: function(fire){
                fire.scene.fireGroup.add(fire)
            }
        });

        this.playerJumps = 0
        this.alive = true
        this.addPlatform(game.config.width, game.config.width / 2, game.config.height * gameOptions.platformVerticalLimit[1])

        this.player = this.physics.add.sprite(gameOptions.playerStartPosition, game.config.height * 0.7, "player")
        this.player.setGravityY(gameOptions.playerGravity)

        this.distance = 0
        this.score = 0
        this.coinsCollected = 0
        this.scoreTxt = this.add.text(20, 0, `Score: ${this.score + 100 * this.coinsCollected}`, {
            fontFamily: "Arial",
            fontSize: 32,
            color: "#ffffff"
        });
        this.scoreUpdate = true

        this.platformCollider = this.physics.add.collider(this.player, this.platformGroup, function(){
            if(!this.player.anims.isPlaying){
                this.player.anims.play("run")
            }
        }, null, this)
        this.physics.add.overlap(this.player, this.coinGroup, function(player, coin){
            this.tweens.add({
                targets: coin,
                y: coin.y - 100,
                alpha: 0,
                duration: 800,
                ease: "Cubic.easeOut",
                repeat: 0,
                loop: 0,
                callbackScope: this,
                onStart: function(){
                    if(this.scoreUpdate) {
                        this.coinsCollected++
                        this.scoreTxt.text = `Score: ${this.score + 100 * this.coinsCollected}`
                        this.scoreUpdate = false
                    }
                },
                onComplete: function(){
                    this.scoreUpdate = true
                    this.coinGroup.killAndHide(coin);
                    this.coinGroup.remove(coin);
                }
            });
        }, null, this)
        this.physics.add.overlap(this.player, this.fireGroup, function(player, fire){
            this.alive = false;
            this.player.anims.stop();
            this.player.setFrame(2);
            this.player.body.setVelocityY(-200);
            this.physics.world.removeCollider(this.platformCollider);

        }, null, this);

        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, false, false)
        this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
        this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)

        this.canJump = true
    }

    addPlatform(platformWidth, posX, posY){
        this.addedPlatforms++

        let platform

        if(this.platformPool.getLength()){
            platform = this.platformPool.getFirst()
            platform.x = posX
            platform.y = posY
            platform.active = true
            platform.visible = true
            this.platformPool.remove(platform)
            platform.displayWidth = platformWidth;
            platform.tileScaleX = 1 / platform.scaleX;
        }
        else{
            platform = this.add.tileSprite(posX, posY, platformWidth, 32, "platform")
            this.physics.add.existing(platform)
            platform.body.setImmovable(true)
            this.platformGroup.add(platform)
        }

        this.nextPlatformDistance = Phaser.Math.Between(gameOptions.spawnRange[0], gameOptions.spawnRange[1])

        if(this.addedPlatforms > 1){
            if(Phaser.Math.Between(1, 100) <= gameOptions.coinPercentage){
                if(this.coinPool.getLength()){
                    let coin = this.coinPool.getFirst();
                    coin.x = posX;
                    coin.y = posY - 96;
                    coin.alpha = 1;
                    coin.active = true;
                    coin.visible = true;
                    this.coinPool.remove(coin);
                }
                else{
                    let coin = this.physics.add.sprite(posX, posY - 96, "coin");
                    coin.setImmovable(true);
                    coin.anims.play("rotate");
                    this.coinGroup.add(coin);
                }
            }

            if(Phaser.Math.Between(1, 100) <= gameOptions.firePercentage){
                if(this.firePool.getLength()){
                    let fire = this.firePool.getFirst();
                    fire.x = posX - platformWidth / 2 + Phaser.Math.Between(1, platformWidth);
                    fire.y = posY - 46;
                    fire.alpha = 1;
                    fire.active = true;
                    fire.visible = true;
                    this.firePool.remove(fire);
                }
                else{
                    let fire = this.physics.add.sprite(posX - platformWidth / 2 + Phaser.Math.Between(1, platformWidth), posY - 46, "fire");
                    fire.setImmovable(true);
                    fire.setVelocityX(platform.body.velocity.x);
                    fire.setSize(8, 2)
                    fire.anims.play("burn");
                    fire.setDepth(2);
                    this.fireGroup.add(fire);
                }
            }
        }
    }

    jump(){
        if(this.alive && (this.player.body.touching.down || (this.playerJumps > 0 && this.playerJumps < gameOptions.jumps))){
            if(this.player.body.touching.down){
                this.playerJumps = 0
            }
            this.player.setVelocityY(gameOptions.jumpForce * -1)
            this.playerJumps ++
            this.player.anims.stop()
        }
    }

    update(){
        if(this.player.y > game.config.height){
            this.scene.start("PlayGame")
        }

        if(this.spaceKey.isDown && this.canJump){
            this.canJump = false
            this.jump()
        }
        this.canJump = this.spaceKey.isUp

        if(!this.aKey.isDown && !this.dKey.isDown){
            this.player.anims.stop()
        }

        if(this.dKey.isDown){
            this.platformGroup.getChildren().forEach(function(platform){
                platform.x -= gameOptions.platformSpeedRange
            }, this)
            this.coinGroup.getChildren().forEach(function(coin){
                coin.x -= gameOptions.platformSpeedRange
            })
            this.fireGroup.getChildren().forEach(function(fire){
                fire.x -= gameOptions.platformSpeedRange
            })
            this.distance += gameOptions.platformSpeedRange
            if(this.distance % 100 === 0 && this.distance > 0) {
                this.score += 25
                this.scoreTxt.text = `Score: ${this.score + 100 * this.coinsCollected}`
            }
        }
        else if(this.aKey.isDown){
            this.platformGroup.getChildren().forEach(function(platform){
                platform.x += gameOptions.platformSpeedRange
            }, this)
            this.coinGroup.getChildren().forEach(function(coin){
                coin.x += gameOptions.platformSpeedRange
            })
            this.fireGroup.getChildren().forEach(function(fire){
                fire.x += gameOptions.platformSpeedRange
            })
            this.distance -= gameOptions.platformSpeedRange
            if(this.distance % 100 === 0) {
                this.score -= 25
                if(this.score < 0){
                    this.score = 0
                }
                this.scoreTxt.text = `Score: ${this.score + 100 * this.coinsCollected}`
            }
        }

        this.player.x = gameOptions.playerStartPosition

        let minDistance = game.config.width
        let rightmostPlatformHeight = 0
        this.platformGroup.getChildren().forEach(function(platform){
            let platformDistance = game.config.width - platform.x - platform.displayWidth / 2
            if(platformDistance < minDistance){
                minDistance = platformDistance
                rightmostPlatformHeight = platform.y
            }
            if(platform.x < - platform.displayWidth / 2){
                this.platformGroup.killAndHide(platform)
                this.platformGroup.remove(platform)
            }
        }, this)

        this.coinGroup.getChildren().forEach(function(coin){
            if(coin.x < - coin.displayWidth / 2){
                this.coinGroup.killAndHide(coin);
                this.coinGroup.remove(coin);
            }
        }, this)

        this.fireGroup.getChildren().forEach(function(fire){
            if(fire.x < - fire.displayWidth / 2){
                this.fireGroup.killAndHide(fire);
                this.fireGroup.remove(fire);
            }
        }, this)

        if(minDistance > this.nextPlatformDistance){
            let nextPlatformWidth = Phaser.Math.Between(gameOptions.platformSizeRange[0], gameOptions.platformSizeRange[1])
            let platformRandomHeight = gameOptions.platformHeightScale * Phaser.Math.Between(gameOptions.platformHeightRange[0], gameOptions.platformHeightRange[1])
            let nextPlatformGap = rightmostPlatformHeight + platformRandomHeight
            let minPlatformHeight = game.config.height * gameOptions.platformVerticalLimit[0]
            let maxPlatformHeight = game.config.height * gameOptions.platformVerticalLimit[1]
            let nextPlatformHeight = Phaser.Math.Clamp(nextPlatformGap, minPlatformHeight, maxPlatformHeight)
            this.addPlatform(nextPlatformWidth, game.config.width + nextPlatformWidth / 2, nextPlatformHeight)
        }
    }
}

function resize(){
    let canvas = document.querySelector("canvas")
    let windowWidth = window.innerWidth
    let windowHeight = window.innerHeight
    let windowRatio = windowWidth / windowHeight
    let gameRatio = game.config.width / game.config.height
    if(windowRatio < gameRatio){
        canvas.style.width = windowWidth + "px"
        canvas.style.height = (windowWidth / gameRatio) + "px"
    }
    else{
        canvas.style.width = (windowHeight * gameRatio) + "px"
        canvas.style.height = windowHeight + "px"
    }
}
