// Interactive CATS-styled Garage Workshop UI & Part Socketing
import { CHASSIS_TYPES, PARTS_CATALOG, PART_TYPES } from './parts.js';

export class GarageManager {
  constructor(game) {
    this.game = game;
    this.selectedChassis = 'scout';
    this.equipped = {
      primary: PARTS_CATALOG.find(p => p.id === 'minigun_mk1'),
      gadget1: PARTS_CATALOG.find(p => p.id === 'nanite_repair'),
      battery: null,
      secondary: null,
      armor: null
    };
    this.activeTab = 'assembly'; // 'assembly' | 'shop'
  }

  init() {
    this.renderChassisSelector();
    this.render();
  }

  setChassis(chassisId) {
    this.selectedChassis = chassisId;
    // Clean up incompatible equipped sockets
    const chassis = CHASSIS_TYPES[chassisId];
    const validSlotIds = new Set(chassis.slots.map(s => s.id));
    for (const key of Object.keys(this.equipped)) {
      if (!validSlotIds.has(key)) {
        if (this.equipped[key]) {
          this.game.waveManager.partsInventory.push(this.equipped[key]);
          this.equipped[key] = null;
        }
      }
    }
    this.game.audio.playSnap();
    this.render();
  }

  equipPart(slotId, partIndex) {
    const part = this.game.waveManager.partsInventory[partIndex];
    if (!part) return;

    // Check slot compatibility
    const chassis = CHASSIS_TYPES[this.selectedChassis];
    const slot = chassis.slots.find(s => s.id === slotId);
    if (!slot || slot.type !== part.type) return;

    // Unequip old part back into inventory if present
    const oldPart = this.equipped[slotId];
    if (oldPart) {
      this.game.waveManager.partsInventory.push(oldPart);
    }

    // Remove new part from inventory and mount it
    this.game.waveManager.partsInventory.splice(partIndex, 1);
    this.equipped[slotId] = part;
    this.game.audio.playSnap();
    this.render();
  }

  unequipPart(slotId) {
    const part = this.equipped[slotId];
    if (!part) return;
    this.game.waveManager.partsInventory.push(part);
    this.equipped[slotId] = null;
    this.game.audio.playSnap();
    this.render();
  }

  buyPart(partId) {
    const partTemplate = PARTS_CATALOG.find(p => p.id === partId);
    if (!partTemplate || this.game.waveManager.credits < partTemplate.cost) return;

    this.game.waveManager.credits -= partTemplate.cost;
    this.game.waveManager.partsInventory.push({ ...partTemplate });
    this.game.audio.playSnap();
    this.render();
  }

  sellInventoryPart(index) {
    const part = this.game.waveManager.partsInventory[index];
    if (!part) return;
    const refund = Math.floor(part.cost * 0.7);
    this.game.waveManager.credits += refund;
    this.game.waveManager.partsInventory.splice(index, 1);
    this.game.audio.playSnap();
    this.render();
  }

  calculateStats() {
    const chassis = CHASSIS_TYPES[this.selectedChassis];
    let extraHp = 0;
    let extraEnergy = 0;
    let usedEnergy = 0;
    let totalDps = 0;
    let shield = 0;
    let damageReduction = 0;

    for (const slot of chassis.slots) {
      const p = this.equipped[slot.id];
      if (!p) continue;
      if (p.energyCost) usedEnergy += p.energyCost;
      if (p.bonusHp) extraHp += p.bonusHp;
      if (p.bonusEnergy) extraEnergy += p.bonusEnergy;
      if (p.maxShield) shield += p.maxShield;
      if (p.damageReduction) damageReduction += p.damageReduction;

      if (p.type === PART_TYPES.WEAPON) {
        const shotsPerSec = 60 / p.fireRate;
        const perShotDmg = p.damage * (p.pellets || 1);
        totalDps += perShotDmg * shotsPerSec;
      }
    }

    const maxEnergy = chassis.baseEnergy + extraEnergy;
    const isOverpowered = usedEnergy > maxEnergy;

    return {
      totalHp: chassis.maxHp + extraHp,
      usedEnergy,
      maxEnergy,
      isOverpowered,
      totalDps: Math.round(totalDps),
      shield,
      damageReduction
    };
  }

  renderChassisSelector() {
    const container = document.getElementById('chassis-list');
    if (!container) return;
    container.innerHTML = '';

    Object.values(CHASSIS_TYPES).forEach(ch => {
      const isSelected = this.selectedChassis === ch.id;
      const btn = document.createElement('button');
      btn.className = `chassis-card ${isSelected ? 'active' : ''}`;
      btn.innerHTML = `
        <div class="chassis-title">${ch.name}</div>
        <div class="chassis-desc">${ch.desc}</div>
        <div class="chassis-meta">⚡ ${ch.baseEnergy} Base Energy | ❤️ ${ch.maxHp} HP | 🎛️ ${ch.slots.length} Sockets</div>
      `;
      btn.onclick = () => this.setChassis(ch.id);
      container.appendChild(btn);
    });
  }

  render() {
    this.renderChassisSelector();
    const stats = this.calculateStats();
    const chassis = CHASSIS_TYPES[this.selectedChassis];

    // Top Stats Bar
    const statsBar = document.getElementById('garage-stats-bar');
    if (statsBar) {
      statsBar.innerHTML = `
        <div class="stat-pill ${stats.isOverpowered ? 'stat-danger' : 'stat-safe'}">
          ⚡ Energy: ${stats.usedEnergy} / ${stats.maxEnergy} MW
        </div>
        <div class="stat-pill">❤️ HP: ${stats.totalHp}</div>
        <div class="stat-pill">⚔️ Est. DPS: ${stats.totalDps}</div>
        <div class="stat-pill">🛡️ Shield: ${stats.shield}</div>
        <div class="stat-pill">🧱 Armor: +${stats.damageReduction} DEF</div>
        <div class="stat-pill stat-gold">💰 Credits: $${this.game.waveManager.credits}</div>
      `;
    }

    // Render Chassis Blueprint & Sockets
    const socketsContainer = document.getElementById('turret-sockets-view');
    if (socketsContainer) {
      socketsContainer.innerHTML = '';
      chassis.slots.forEach(slot => {
        const equippedPart = this.equipped[slot.id];
        const slotEl = document.createElement('div');
        slotEl.className = `socket-box ${equippedPart ? 'socket-filled' : 'socket-empty'}`;
        slotEl.innerHTML = `
          <div class="socket-header">
            <span class="socket-type-badge">${slot.type.toUpperCase()}</span>
            <span class="socket-name">${slot.label}</span>
          </div>
          ${equippedPart ? `
            <div class="part-mounted-info">
              <div class="part-name">${equippedPart.icon} ${equippedPart.name}</div>
              <div class="part-stats">${equippedPart.energyCost ? `⚡ ${equippedPart.energyCost} MW` : ''} ${equippedPart.damage ? `⚔️ ${equippedPart.damage} DMG` : ''}</div>
              <button class="btn-unequip">Detach ✖</button>
            </div>
          ` : `
            <div class="empty-prompt">Drop / Click ${slot.type} to mount</div>
          `}
        `;

        const unequipBtn = slotEl.querySelector('.btn-unequip');
        if (unequipBtn) {
          unequipBtn.onclick = (e) => {
            e.stopPropagation();
            this.unequipPart(slot.id);
          };
        }

        socketsContainer.appendChild(slotEl);
      });
    }

    // Render Inventory Parts
    const invContainer = document.getElementById('inventory-parts-list');
    if (invContainer) {
      invContainer.innerHTML = '';
      if (this.game.waveManager.partsInventory.length === 0) {
        invContainer.innerHTML = `<div class="empty-state">No spare parts in warehouse. Buy from the Military Armory tab!</div>`;
      } else {
        this.game.waveManager.partsInventory.forEach((part, index) => {
          const card = document.createElement('div');
          card.className = 'inv-part-card';
          card.innerHTML = `
            <div class="inv-part-header">
              <span class="part-title">${part.icon} ${part.name}</span>
              <span class="part-tier">Tier ${part.tier}</span>
            </div>
            <div class="inv-part-desc">${part.desc}</div>
            <div class="inv-part-meta">
              ${part.energyCost ? `<span>⚡ ${part.energyCost} MW</span>` : ''}
              ${part.damage ? `<span>⚔️ ${part.damage} DMG</span>` : ''}
              ${part.bonusHp ? `<span>❤️ +${part.bonusHp} HP</span>` : ''}
              ${part.maxShield ? `<span>🛡️ +${part.maxShield} SHD</span>` : ''}
            </div>
            <div class="inv-actions">
              <button class="btn-action-primary btn-equip-action">Mount on Turret</button>
              <button class="btn-action-sub btn-sell-action">Scrap ($${Math.floor(part.cost * 0.7)})</button>
            </div>
          `;

          // Quick Mount to first matching empty slot
          const equipBtn = card.querySelector('.btn-equip-action');
          if (equipBtn) {
            equipBtn.onclick = () => {
              const openSlot = chassis.slots.find(s => s.type === part.type && !this.equipped[s.id]);
              if (openSlot) {
                this.equipPart(openSlot.id, index);
              } else {
                // If all matching slots full, replace first matching slot
                const firstMatching = chassis.slots.find(s => s.type === part.type);
                if (firstMatching) {
                  this.equipPart(firstMatching.id, index);
                } else {
                  alert(`No compatible ${part.type.toUpperCase()} socket on ${chassis.name}!`);
                }
              }
            };
          }

          const sellBtn = card.querySelector('.btn-sell-action');
          if (sellBtn) {
            sellBtn.onclick = () => this.sellInventoryPart(index);
          }

          invContainer.appendChild(card);
        });
      }
    }

    // Render Armory Shop Tab
    const shopContainer = document.getElementById('armory-shop-list');
    if (shopContainer) {
      shopContainer.innerHTML = '';
      PARTS_CATALOG.forEach(part => {
        const canAfford = this.game.waveManager.credits >= part.cost;
        const shopCard = document.createElement('div');
        shopCard.className = `shop-part-card ${canAfford ? '' : 'unaffordable'}`;
        shopCard.innerHTML = `
          <div class="inv-part-header">
            <span class="part-title">${part.icon} ${part.name}</span>
            <span class="part-cost">$${part.cost}</span>
          </div>
          <div class="inv-part-desc">${part.desc}</div>
          <div class="inv-part-meta">
            <span>Type: ${part.type.toUpperCase()}</span>
            ${part.energyCost ? `<span>⚡ ${part.energyCost} MW</span>` : ''}
            ${part.damage ? `<span>⚔️ ${part.damage} DMG</span>` : ''}
          </div>
          <button class="btn-action-primary ${canAfford ? '' : 'disabled'}" ${canAfford ? '' : 'disabled'}>
            Purchase Part
          </button>
        `;

        const buyBtn = shopCard.querySelector('button');
        if (buyBtn && canAfford) {
          buyBtn.onclick = () => this.buyPart(part.id);
        }
        shopContainer.appendChild(shopCard);
      });
    }

    // Launch Button Check (Disabled if overpowered)
    const launchBtn = document.getElementById('btn-launch-wave');
    if (launchBtn) {
      if (stats.isOverpowered) {
        launchBtn.disabled = true;
        launchBtn.textContent = '⚠️ Over Energy Budget!';
        launchBtn.className = 'btn-launch btn-launch-disabled';
      } else {
        launchBtn.disabled = false;
        launchBtn.textContent = `Deploy Turret ➔ Wave ${this.game.waveManager.wave + 1}`;
        launchBtn.className = 'btn-launch btn-launch-ready';
      }
    }
  }

  applyToTurret() {
    this.game.turret.chassisId = this.selectedChassis;
    this.game.turret.equipped = { ...this.equipped };
    this.game.turret.recalculateStats();
    this.game.turret.hp = this.game.turret.maxHp;
    this.game.turret.shield = this.game.turret.maxShield;
  }
}
