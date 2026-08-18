// Inventory, Hotbar (1-9, 0), and Item Management System

export const ITEM_DEFS = {
  sword: { id: 'sword', name: 'Iron Broadsword', type: 'weapon', icon: '🗡️', desc: 'Sharp iron blade for monster combat.' },
  pickaxe: { id: 'pickaxe', name: 'Mining Pickaxe', type: 'tool', icon: '⛏️', desc: 'Heavy pick for mining ores & rocks.' },
  axe: { id: 'axe', name: 'Felling Axe', type: 'tool', icon: '🪓', desc: 'Sharp axe for chopping trees & logs.' },
  potion: { id: 'potion', name: 'Herbal Elixir', type: 'consumable', icon: '🧪', desc: 'Restores 40 Health Points.' },
  Wood: { id: 'Wood', name: 'Wood Planks', type: 'material', icon: '🪵', desc: 'Sturdy timber for construction.' },
  'Copper Ore': { id: 'Copper Ore', name: 'Copper Ore', type: 'material', icon: '🪨', desc: 'Raw copper chunks.' },
  'Iron Ore': { id: 'Iron Ore', name: 'Iron Ore', type: 'material', icon: '⚙️', desc: 'Smeltable iron ore.' },
  'Gold Ore': { id: 'Gold Ore', name: 'Gold Ore', type: 'material', icon: '✨', desc: 'Precious gold nuggets.' },
  'Slime Jelly': { id: 'Slime Jelly', name: 'Slime Jelly', type: 'material', icon: '🟢', desc: 'Bouncy crafting gel.' }
};

export class InventorySystem {
  constructor() {
    this.hotbarSlots = [
      { item: 'sword', count: 1 },
      { item: 'pickaxe', count: 1 },
      { item: 'axe', count: 1 },
      { item: 'potion', count: 3 },
      null, null, null, null, null, null
    ];
    this.selectedIndex = 0;
    this.bag = [];
  }

  getSelectedItem() {
    const slot = this.hotbarSlots[this.selectedIndex];
    return slot ? slot.item : null;
  }

  selectSlot(index) {
    if (index >= 0 && index < this.hotbarSlots.length) {
      this.selectedIndex = index;
      this.renderHotbarUI();
    }
  }

  addItem(itemId, count = 1) {
    // 1. Try to stack in hotbar
    for (const slot of this.hotbarSlots) {
      if (slot && slot.item === itemId) {
        slot.count += count;
        this.renderHotbarUI();
        return;
      }
    }

    // 2. Try empty hotbar slot
    for (let i = 0; i < this.hotbarSlots.length; i++) {
      if (!this.hotbarSlots[i]) {
        this.hotbarSlots[i] = { item: itemId, count };
        this.renderHotbarUI();
        return;
      }
    }

    // 3. Put in backpack
    this.bag.push({ item: itemId, count });
  }

  usePotion(player, audio, floatTexts) {
    const slot = this.hotbarSlots[this.selectedIndex];
    if (slot && slot.item === 'potion' && slot.count > 0 && player.hp < player.maxHp) {
      slot.count--;
      if (slot.count <= 0) this.hotbarSlots[this.selectedIndex] = null;
      player.hp = Math.min(player.maxHp, player.hp + 40);
      audio.playPickup();
      floatTexts.push({ x: player.x, y: player.y - 10, text: '+40 HP', color: '#4ade80', update: () => {}, draw: () => {} });
      this.renderHotbarUI();
    }
  }

  renderHotbarUI() {
    const container = document.getElementById('hotbar-container');
    if (!container) return;
    container.innerHTML = '';

    this.hotbarSlots.forEach((slot, index) => {
      const isSelected = this.selectedIndex === index;
      const el = document.createElement('div');
      el.className = `hotbar-slot ${isSelected ? 'active' : ''}`;

      const keyLabel = (index + 1) % 10;
      if (slot) {
        const def = ITEM_DEFS[slot.item] || { name: slot.item, icon: '📦' };
        el.innerHTML = `
          <span class="slot-num">${keyLabel}</span>
          <span class="slot-icon">${def.icon}</span>
          ${slot.count > 1 ? `<span class="slot-count">${slot.count}</span>` : ''}
        `;
      } else {
        el.innerHTML = `<span class="slot-num">${keyLabel}</span>`;
      }

      el.onclick = () => this.selectSlot(index);
      container.appendChild(el);
    });

    // Update active item name
    const labelEl = document.getElementById('active-item-name');
    if (labelEl) {
      const cur = this.getSelectedItem();
      labelEl.textContent = cur ? (ITEM_DEFS[cur] ? ITEM_DEFS[cur].name : cur) : 'Empty Hand';
    }
  }
}
