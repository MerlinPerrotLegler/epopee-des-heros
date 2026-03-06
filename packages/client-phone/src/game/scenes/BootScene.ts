import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    const { width, height } = this.scale;
    const barWidth = 200;
    const barHeight = 16;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x333333, 0.8);
    progressBox.fillRoundedRect(
      width / 2 - barWidth / 2,
      height / 2 - barHeight / 2,
      barWidth,
      barHeight,
      8,
    );

    this.load.on("progress", (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xc8a962, 1);
      progressBar.fillRoundedRect(
        width / 2 - barWidth / 2 + 3,
        height / 2 - barHeight / 2 + 3,
        (barWidth - 6) * value,
        barHeight - 6,
        5,
      );
    });

    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
    });

    // TODO: load player assets here in future phases
  }

  create() {
    this.scene.start("JoinScene");
  }
}
