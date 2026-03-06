import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    // Create a simple loading bar
    const { width, height } = this.scale;
    const barWidth = 300;
    const barHeight = 20;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x333333, 0.8);
    progressBox.fillRoundedRect(
      width / 2 - barWidth / 2,
      height / 2 - barHeight / 2,
      barWidth,
      barHeight,
      10,
    );

    this.load.on("progress", (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xc8a962, 1);
      progressBar.fillRoundedRect(
        width / 2 - barWidth / 2 + 4,
        height / 2 - barHeight / 2 + 4,
        (barWidth - 8) * value,
        barHeight - 8,
        6,
      );
    });

    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
    });

    // TODO: load game assets here in future phases
    // this.load.image("board", "assets/images/board.png");
    // this.load.spritesheet("cards", "assets/images/cards.png", { ... });
  }

  create() {
    this.scene.start("LobbyScene");
  }
}
