// CATS Visual Robot Workshop & 3-Choice Roguelite Draft Module
import { CHASSIS_ROBOTS, generateSupplyDraft, ALL_PARTS } from './parts_data.js';

export class WorkbenchSystem {
  constructor(game) {
    this.game = game;
    this.inventory = [
      ALL_PARTS.find(p => p.id === 'rapid_blaster'),
      ALL_PARTS.find(p => p.id === 'whirling_saw')
    ];
    this.draftChoices = [];
    this.currentWave = 1;
    this.selectedSocketId = null;

    // Equip default starting setup
    this.game.robot.equipped = {
      front_gun: ALL_PARTS.find(p => p.id === 'rapid_blaster'),
      top_mount: ALL_PARTS.find(p => p.id === 'whirling_saw')
    };
    this.game.robot.recalculateStats();
  }

  init() {
    this.setupEvents();
    this.renderBlueprintCanvas();
  }

  setupEvents() {
    // Chassis switch buttons
    document.querySelectorAll('.btn-chassis-select').forEach(btn => {
      btn.onclick = () => {
        const cId = btn.dataset.chassis;
        this.selectChassis(cId);
      };
    });

    // Deploy / Start Wave button
    const deployBtn = document.getElementById('btn-deploy-robot');
    if (deployBtn) {
      deployBtn.onclick = () => this.startWave();
    }
  }

  // Trigger 3-Choice Roguelite Card Draft
  openDraftModal(waveNum) {
    this.currentWave = waveNum;
    this.draftChoices = generateSupplyDraft(waveNum, this.inventory.map(p => p.id));

    const modal = document.getElementById('draft-modal');
    const container = document.getElementById('draft-cards-container');
    const title = document.getElementById('draft-wave-title');

    if (title) title.textContent = `WAVE ${waveNum} REWARD: SELECT 1 SUPPLY CRATE`;
    if (container) {
      container.innerHTML = '';
      this.draftChoices.forEach((part, index) => {
        const card = document.createElement('div');
        card.className = `draft-card rarity-${part.rarity}`;
        card.innerHTML = `
          <div class="card-rarity-badge">${part.rarity.toUpperCase()}</div>
          <div class="card-icon-art">${part.icon}</div>
          <h3 class="card-title">${part.name}</h3>
          <div class="card-stats-pill">${part.statsText}</div>
          <p class="card-description">${part.desc}</p>
          <button class="btn-claim-card">Claim Part ➔</button>
        `;

        card.onclick = () => {
          this.claimDraftPart(part);
        };
        container.appendChild(card);
      });
    }

    if (modal) modal.classList.remove('hidden');
    this.game.audio.playSnap();
  }

  claimDraftPart(part) {
    this.inventory.push({ ...part });
    const modal = document.getElementById('draft-modal');
    if (modal) modal.classList.add('hidden');

    this.game.audio.playSnap();
    this.openWorkbench();
  }

  openWorkbench() {
    const wb = document.getElementById('workbench-modal');
    if (wb) wb.classList.remove('hidden');
    this.render();
  }

  selectChassis(chassisId) {
    if (!CHASSIS_ROBOTS[chassisId]) return;
    this.game.robot.chassisId = chassisId;
    this.game.robot.chassis = CHASSIS_ROBOTS[chassisId];

    // Unequip sockets that do not exist on the new chassis
    const validSockets = new Set(this.game.robot.chassis.sockets.map(s => s.id));
    for (const key of Object.keys(this.game.robot.equipped)) {
      if (!validSockets.has(key) && this.game.robot.equipped[key]) {
        this.inventory.push(this.game.robot.equipped[key]);
        this.game.robot.equipped[key] = null;
      }
    }

    this.game.robot.recalculateStats();
    this.game.audio.playSnap();
    this.render();
  }

  equipPart(socketId, invIndex) {
    const part = this.inventory[invIndex];
    if (!part) return;

    // Check socket type match
    const socket = this.game.robot.chassis.sockets.find(s => s.id === socketId);
    if (!socket || socket.type !== part.type) return;

    // If socket already has a part, return it to inventory
    const oldPart = this.game.robot.equipped[socketId];
    if (oldPart) {
      this.inventory.push(oldPart);
    }

    // Mount new part
    this.inventory.splice(invIndex, 1);
    this.game.robot.equipped[socketId] = part;
    this.game.robot.recalculateStats();
    this.game.audio.playSnap();
    this.render();
  }

  unequipSocket(socketId) {
    const part = this.game.robot.equipped[socketId];
    if (!part) return;
    this.inventory.push(part);
    this.game.robot.equipped[socketId] = null;
    this.game.robot.recalculateStats();
    this.game.audio.playSnap();
    this.render();
  }

  startWave() {
    this.game.robot.recalculateStats();
    if (this.game.robot.usedPower > this.game.robot.powerCapacity) {
      alert('Your robot is exceeding its Power Capacity! Detach a heavy weapon or install a battery before deploying.');
      return;
    }

    const wb = document.getElementById('workbench-modal');
    if (wb) wb.classList.add('hidden');

    this.game.robot.hp = this.game.robot.maxHp;
    this.game.robot.shield = this.game.robot.maxShield;
    this.game.startCombatWave(this.currentWave);
  }

  render() {
    const robot = this.game.robot;
    const chassis = robot.chassis;

    // 1. Update Energy & Stats Bar
    const isOverpowered = robot.usedPower > robot.powerCapacity;
    const statsBar = document.getElementById('wb-stats-bar');
    if (statsBar) {
      statsBar.innerHTML = `
        <div class="wb-pill ${isOverpowered ? 'pill-danger' : 'pill-safe'}">
          ⚡ Power Grid: ${robot.usedPower} / ${robot.powerCapacity} MW
        </div>
        <div class="wb-pill">❤️ Hull HP: ${robot.maxHp}</div>
        <div class="wb-pill">💨 Speed: ${Math.round(robot.speed * 10)} km/h</div>
        <div class="wb-pill">🛡️ Shield: ${robot.maxShield}</div>
        <div class="wb-pill">🧚 Repair Rate: +${Math.round(robot.healRate * 60)} HP/s</div>
      `;
    }

    // 2. Chassis Switch Buttons state
    document.querySelectorAll('.btn-chassis-select').forEach(btn => {
      if (btn.dataset.chassis === robot.chassisId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 3. Render Sockets List
    const socketsList = document.getElementById('wb-sockets-list');
    if (socketsList) {
      socketsList.innerHTML = '';
      chassis.sockets.forEach(socket => {
        const equippedPart = robot.equipped[socket.id];
        const item = document.createElement('div');
        item.className = `socket-row ${equippedPart ? 'has-part' : 'is-empty'}`;
        item.innerHTML = `
          <div class="socket-icon-tag">${socket.icon}</div>
          <div class="socket-details">
            <div class="socket-title">${socket.label} <span class="socket-type">(${socket.type})</span></div>
            ${equippedPart ? `
              <div class="mounted-part-title">${equippedPart.icon} ${equippedPart.name}</div>
              <div class="mounted-part-stats">${equippedPart.statsText}</div>
            ` : `
              <div class="empty-socket-hint">Click a matching part from inventory to mount</div>
            `}
          </div>
          ${equippedPart ? `<button class="btn-detach-socket">Detach ✖</button>` : ''}
        `;

        const detachBtn = item.querySelector('.btn-detach-socket');
        if (detachBtn) {
          detachBtn.onclick = () => this.unequipSocket(socket.id);
        }

        socketsList.appendChild(item);
      });
    }

    // 4. Render Warehouse Inventory
    const invContainer = document.getElementById('wb-inventory-list');
    if (invContainer) {
      invContainer.innerHTML = '';
      if (this.inventory.length === 0) {
        invContainer.innerHTML = `<div class="empty-inventory">Warehouse empty. Clear waves to earn more supply crates!</div>`;
      } else {
        this.inventory.forEach((part, index) => {
          const card = document.createElement('div');
          card.className = `inv-card rarity-${part.rarity}`;
          card.innerHTML = `
            <div class="inv-header">
              <span class="inv-name">${part.icon} ${part.name}</span>
              <span class="inv-type">${part.type.toUpperCase()}</span>
            </div>
            <div class="inv-stats">${part.statsText}</div>
            <div class="inv-desc">${part.desc}</div>
            <button class="btn-mount-part">Mount to Robot ➔</button>
          `;

          const mountBtn = card.querySelector('.btn-mount-part');
          if (mountBtn) {
            mountBtn.onclick = () => {
              // Find first empty matching socket
              const emptySocket = chassis.sockets.find(s => s.type === part.type && !robot.equipped[s.id]);
              if (emptySocket) {
                this.equipPart(emptySocket.id, index);
              } else {
                // If all full, replace first socket
                const firstSocket = chassis.sockets.find(s => s.type === part.type);
                if (firstSocket) {
                  this.equipPart(firstSocket.id, index);
                } else {
                  alert(`No compatible ${part.type.toUpperCase()} sockets on ${chassis.name}!`);
                }
              }
            };
          }

          invContainer.appendChild(card);
        });
      }
    }

    // 5. Update Deploy Button State
    const deployBtn = document.getElementById('btn-deploy-robot');
    if (deployBtn) {
      if (isOverpowered) {
        deployBtn.disabled = true;
        deployBtn.textContent = '⚠️ Over Power Capacity!';
        deployBtn.className = 'btn-deploy btn-deploy-disabled';
      } else {
        deployBtn.disabled = false;
        deployBtn.textContent = `Deploy Robot (Start Wave ${this.currentWave}) ➔`;
        deployBtn.className = 'btn-deploy btn-deploy-ready';
      }
    }

    this.renderBlueprintCanvas();
  }

  // Draw Interactive Blueprint on Dedicated Preview Canvas
  renderBlueprintCanvas() {
    const canvas = document.getElementById('wb-blueprint-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid background
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw Robot on Center of Blueprint Canvas
    this.game.robot.drawRobotAt(ctx, canvas.width / 2, canvas.height / 2, 0, true);
  }
}
