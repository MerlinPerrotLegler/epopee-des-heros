import Phaser from "phaser";

export class HandScene extends Phaser.Scene {
  constructor() {
    super({ key: "HandScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Player header
    this.add
      .rectangle(width / 2, 50, width, 100, 0x2a2a4a)
      .setStrokeStyle(1, 0xc8a962);

    this.add
      .text(width / 2, 35, "Aventurier", {
        fontSize: "22px",
        color: "#c8a962",
        fontFamily: "Georgia, serif",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 65, "Score: 0  |  Position: 0", {
        fontSize: "14px",
        color: "#8888aa",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);

    // Hand area title
    this.add
      .text(width / 2, 130, "Votre main", {
        fontSize: "18px",
        color: "#aaaacc",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);

    // Placeholder cards
    const cardWidth = 80;
    const cardHeight = 120;
    const cardSpacing = 15;
    const totalCards = 4;
    const totalWidth = totalCards * cardWidth + (totalCards - 1) * cardSpacing;
    const startX = width / 2 - totalWidth / 2 + cardWidth / 2;

    for (let i = 0; i < totalCards; i++) {
      const x = startX + i * (cardWidth + cardSpacing);
      const y = 240;

      const card = this.add
        .rectangle(x, y, cardWidth, cardHeight, 0x3d3d5c)
        .setStrokeStyle(2, 0xc8a962)
        .setInteractive({ useHandCursor: true, draggable: true });

      this.add
        .text(x, y, `Carte\n${i + 1}`, {
          fontSize: "14px",
          color: "#ccccee",
          fontFamily: "sans-serif",
          align: "center",
        })
        .setOrigin(0.5);

      // Card hover effect
      card.on("pointerover", () => card.setStrokeStyle(3, 0xe8c872));
      card.on("pointerout", () => card.setStrokeStyle(2, 0xc8a962));
    }

    // Action buttons area
    const actionsY = 450;

    this.add
      .text(width / 2, actionsY - 30, "Actions", {
        fontSize: "18px",
        color: "#aaaacc",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);

    // Roll dice button
    const diceBtn = this.add
      .text(width / 2, actionsY + 30, "🎲 Lancer les dés", {
        fontSize: "22px",
        color: "#1a1a2e",
        backgroundColor: "#e8c872",
        padding: { x: 25, y: 12 },
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    diceBtn.on("pointerdown", () => {
      const d12 = Phaser.Math.Between(1, 12);
      const d8 = Phaser.Math.Between(1, 8);
      this.showDiceResult(d12, d8);
    });

    // End turn button
    const endTurnBtn = this.add
      .text(width / 2, actionsY + 100, "⏭️ Fin de tour", {
        fontSize: "18px",
        color: "#ccccee",
        backgroundColor: "#333355",
        padding: { x: 25, y: 12 },
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    endTurnBtn.on("pointerover", () => endTurnBtn.setAlpha(0.8));
    endTurnBtn.on("pointerout", () => endTurnBtn.setAlpha(1));

    // Back button
    this.add
      .text(20, height - 40, "← Retour", {
        fontSize: "14px",
        color: "#666688",
        fontFamily: "sans-serif",
      })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.scene.start("JoinScene"));

    // Turn indicator
    this.add
      .text(width / 2, height - 40, "En attente de votre tour...", {
        fontSize: "14px",
        color: "#555577",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);
  }

  private showDiceResult(d12: number, d8: number) {
    const { width } = this.scale;

    const resultText = this.add
      .text(width / 2, 650, `🎲 d12: ${d12}  |  d8: ${d8}`, {
        fontSize: "28px",
        color: "#ffffff",
        backgroundColor: "#000000cc",
        padding: { x: 20, y: 15 },
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
        this.time.delayedCall(2500, () => {
          this.tweens.add({
            targets: resultText,
            alpha: 0,
            duration: 400,
            onComplete: () => resultText.destroy(),
          });
        });
      },
    });
  }
}
