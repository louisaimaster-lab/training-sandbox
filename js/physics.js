// Terraria-styled platformer physics and tile collisions

export const GRAVITY = 0.42;
export const MAX_FALL_SPEED = 9.5;
export const MOVE_ACCEL = 0.45;
export const MOVE_DECEL = 0.78;
export const MAX_RUN_SPEED = 3.6;
export const JUMP_FORCE = -7.6;

export class Physics {
  static updateEntity(entity, world, dropDown = false) {
    // Apply gravity
    entity.vy += GRAVITY;
    if (entity.vy > MAX_FALL_SPEED) {
      entity.vy = MAX_FALL_SPEED;
    }

    // Horizontal movement & collision
    entity.x += entity.vx;
    this.resolveHorizontal(entity, world);

    // Vertical movement & collision
    entity.y += entity.vy;
    this.resolveVertical(entity, world, dropDown);
  }

  static resolveHorizontal(entity, world) {
    const tileLeft = Math.floor((entity.x) / world.tileSize);
    const tileRight = Math.floor((entity.x + entity.width) / world.tileSize);
    const tileTop = Math.floor((entity.y) / world.tileSize);
    const tileBottom = Math.floor((entity.y + entity.height - 1) / world.tileSize);

    // Left wall collision
    if (entity.vx < 0) {
      for (let y = tileTop; y <= tileBottom; y++) {
        if (world.isSolid(tileLeft, y)) {
          entity.x = (tileLeft + 1) * world.tileSize;
          entity.vx = 0;
          break;
        }
      }
    }
    // Right wall collision
    else if (entity.vx > 0) {
      for (let y = tileTop; y <= tileBottom; y++) {
        if (world.isSolid(tileRight, y)) {
          entity.x = tileRight * world.tileSize - entity.width;
          entity.vx = 0;
          break;
        }
      }
    }

    // Arena boundary clamp
    if (entity.x < 16) {
      entity.x = 16;
      entity.vx = 0;
    } else if (entity.x + entity.width > world.width * world.tileSize - 16) {
      entity.x = world.width * world.tileSize - 16 - entity.width;
      entity.vx = 0;
    }
  }

  static resolveVertical(entity, world, dropDown) {
    const tileLeft = Math.floor((entity.x + 2) / world.tileSize);
    const tileRight = Math.floor((entity.x + entity.width - 3) / world.tileSize);
    const tileTop = Math.floor((entity.y) / world.tileSize);
    const tileBottom = Math.floor((entity.y + entity.height) / world.tileSize);

    entity.grounded = false;

    // Moving up
    if (entity.vy < 0) {
      for (let x = tileLeft; x <= tileRight; x++) {
        if (world.isSolid(x, tileTop)) {
          entity.y = (tileTop + 1) * world.tileSize;
          entity.vy = 0;
          break;
        }
      }
    }
    // Moving down / falling
    else if (entity.vy >= 0) {
      for (let x = tileLeft; x <= tileRight; x++) {
        // Check solid block
        if (world.isSolid(x, tileBottom)) {
          entity.y = tileBottom * world.tileSize - entity.height;
          entity.vy = 0;
          entity.grounded = true;
          break;
        }
        // Check one-way platform
        if (!dropDown && world.isPlatform(x, tileBottom)) {
          const prevBottom = entity.y + entity.height - entity.vy;
          const platformTop = tileBottom * world.tileSize;
          // Only land if previously above or near platform top
          if (prevBottom <= platformTop + 4) {
            entity.y = platformTop - entity.height;
            entity.vy = 0;
            entity.grounded = true;
            break;
          }
        }
      }
    }
  }

  static aabb(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }
}
