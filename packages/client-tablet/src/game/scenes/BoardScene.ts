import Phaser from "phaser";

export class BoardScene extends Phaser.Scene {
  constructor() {
    super({ key: "BoardScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Board background
    this.add
      .rectangle(width / 2, height / 2, width - 40, height - 40, 0x2a2a4a)
      .setStrokeStyle(2, 0xc8a962);

    // Title
    this.add
      .text(width / 2, 30, "🗺️ Plateau de jeu", {
        fontSize: "24px",
        color: "#c8a962",
        fontFamily: "Georgia, serif",
      })
      .setOrigin(0.5);

    // Placeholder grid (will be replaced with actual board art)
    const gridSize = 8;
    const tileSize = 70;
    const startX = width / 2 - (gridSize * tileSize) / 2;
    const startY = height / 2 - (gridSize * tileSize) / 2 + 20;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = startX + col * tileSize + tileSize / 2;
        const y = startY + row * tileSize + tileSize / 2;
        const isDark = (row + col) % 2 === 0;

        this.add
          .rectangle(x, y, tileSize - 4, tileSize - 4, isDark ? 0x333355 : 0x3d3d5c)
          .setStrokeStyle(1, 0x555577)
          .setInteractive({ useHandCursor: true })
          .on("pointerover", function (this: Phaser.GameObjects.Rectangle) {
            this.setFillStyle(0x4a4a6a);
          })
          .on("pointerout", function (this: Phaser.GameObjects.Rectangle) {
            this.setFillStyle(isDark ? 0x333355 : 0x3d3d5c);
          });
      }
    }

    // Dice roll button (placeholder for 3D dice)
    const diceBtn = this.add
      .text(width - 120, height - 60, "🎲 Lancer", {
        fontSize: "22px",
        color: "#1a1a2e",
        backgroundColor: "#e8c872",
        padding: { x: 15, y: 10 },
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    diceBtn.on("pointerdown", () => {
      // TODO: trigger 3D dice in Phase 5
      const d12 = Phaser.Math.Between(1, 12);
      const d8 = Phaser.Math.Between(1, 8);
      this.showDiceResult(d12, d8);
    });

    // Back button
    this.add
      .text(60, height - 60, "← Lobby", {
        fontSize: "16px",
        color: "#8888aa",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.scene.start("LobbyScene"));
  }

  private showDiceResult(d12: number, d8: number) {
    const { width, height } = this.scale;

    const resultText = this.add
      .text(width / 2, height / 2, `d12: ${d12}  |  d8: ${d8}`, {
        fontSize: "40px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 30, y: 20 },
        fontFamily: "monospace",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(100);

    this.tweens.add({
      targets: resultText,
      alpha: 1,
      scale: { from: 0.5, to: 1 },
      duration: 300,
      ease: "Back.easeOut",
      onComplete: () => {
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: resultText,
            alpha: 0,
            y: resultText.y - 50,
            duration: 500,
            onComplete: () => resultText.destroy(),
          });
        });
      },
    });
  }
}
