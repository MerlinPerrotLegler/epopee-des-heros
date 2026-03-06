import Phaser from "phaser";

export class JoinScene extends Phaser.Scene {
  constructor() {
    super({ key: "JoinScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Title
    this.add
      .text(width / 2, 80, "⚔️ Épopée\ndes Héros", {
        fontSize: "36px",
        color: "#c8a962",
        fontFamily: "Georgia, serif",
        align: "center",
      })
      .setOrigin(0.5);

    // Room code input placeholder
    this.add
      .text(width / 2, 250, "Entrer le code de la room:", {
        fontSize: "18px",
        color: "#aaaacc",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);

    // Code display (will be replaced by real input in Phase 2)
    this.add
      .text(width / 2, 310, "_ _ _ _", {
        fontSize: "42px",
        color: "#ffffff",
        fontFamily: "monospace",
        letterSpacing: 10,
        backgroundColor: "#333355",
        padding: { x: 30, y: 15 },
      })
      .setOrigin(0.5);

    // Player name
    this.add
      .text(width / 2, 420, "Votre nom:", {
        fontSize: "18px",
        color: "#aaaacc",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 470, "Aventurier", {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "sans-serif",
        backgroundColor: "#333355",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5);

    // Join button
    const joinBtn = this.add
      .text(width / 2, 580, "Rejoindre la partie", {
        fontSize: "24px",
        color: "#1a1a2e",
        backgroundColor: "#c8a962",
        padding: { x: 30, y: 15 },
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    joinBtn.on("pointerdown", () => {
      this.scene.start("HandScene");
    });

    joinBtn.on("pointerover", () => joinBtn.setAlpha(0.8));
    joinBtn.on("pointerout", () => joinBtn.setAlpha(1));

    // Info text
    this.add
      .text(width / 2, height - 60, "La connexion Colyseus\nsera ajoutée en Phase 2", {
        fontSize: "14px",
        color: "#555577",
        fontFamily: "sans-serif",
        align: "center",
      })
      .setOrigin(0.5);
  }
}
