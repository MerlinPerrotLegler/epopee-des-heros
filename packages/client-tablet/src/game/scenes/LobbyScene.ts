import Phaser from "phaser";

export class LobbyScene extends Phaser.Scene {
  private playerTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: "LobbyScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Title
    this.add
      .text(width / 2, 80, "⚔️ Épopée des Héros", {
        fontSize: "48px",
        color: "#c8a962",
        fontFamily: "Georgia, serif",
      })
      .setOrigin(0.5);

    // Subtitle
    this.add
      .text(width / 2, 140, "Plateau de jeu — En attente des joueurs...", {
        fontSize: "20px",
        color: "#8888aa",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);

    // Room code placeholder
    this.add
      .text(width / 2, 220, "Code: ----", {
        fontSize: "36px",
        color: "#ffffff",
        fontFamily: "monospace",
        backgroundColor: "#333355",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5);

    // Player list area
    this.add
      .text(width / 2, 320, "Joueurs connectés:", {
        fontSize: "22px",
        color: "#aaaacc",
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5);

    // Placeholder message
    this.add
      .text(width / 2, 400, "Aucun joueur connecté\n(la connexion Colyseus sera ajoutée en Phase 2)", {
        fontSize: "16px",
        color: "#666688",
        fontFamily: "sans-serif",
        align: "center",
      })
      .setOrigin(0.5);

    // Start button (disabled for now)
    const startBtn = this.add
      .text(width / 2, height - 100, "▶ Commencer la partie", {
        fontSize: "28px",
        color: "#1a1a2e",
        backgroundColor: "#c8a962",
        padding: { x: 30, y: 15 },
        fontFamily: "sans-serif",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.5);

    startBtn.on("pointerdown", () => {
      this.scene.start("BoardScene");
    });

    startBtn.on("pointerover", () => startBtn.setAlpha(0.8));
    startBtn.on("pointerout", () => startBtn.setAlpha(0.5));
  }
}
