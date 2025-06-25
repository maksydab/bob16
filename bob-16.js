//bob16 by-maksydab
const lua     = fengari.lua;
const lauxlib = fengari.lauxlib;
const lualib  = fengari.lualib;
const to_luastring = fengari.to_luastring;

class bob16 {
  constructor({ width = 256, height = 144, appendTo = document.body, fontAtlasSrc = null } = {}) {
    this.width = width;
    this.height = height;

    this.palette = [
      '#000000', '#1D2B53', '#e33267', '#008751', '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
      '#e31452', '#FFA300', '#FFEC27', '#00E436', '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA',
      '#222034', '#45283C', '#663931', '#8F563B', '#DF7126', '#D9A066', '#EEC39A', '#FBF236',
      '#99E550', '#6ABE30', '#37946E', '#4B692F', '#1f1f1f', '#323C39', '#3F3F74', '#306082',

    ];

    this.fontLoaded = false;
    if (fontAtlasSrc) {
      this.fontAtlas = new Image();
      this.fontAtlas.crossOrigin = "anonymous";
      this.fontAtlas.onload = () => { this.fontLoaded = true; };
      this.fontAtlas.src = fontAtlasSrc;
    }

    this.buffer = document.createElement('canvas');
    this.buffer.width = this.width;
    this.buffer.height = this.height;
    this.bctx = this.buffer.getContext('2d');
    this.bctx.imageSmoothingEnabled = false;

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    appendTo.appendChild(this.canvas);

    this.keys = new Set();
    this.clickCallbacks = [];
    this.keyCallbacks = {};
    this.anyKeyCallbacks = [];
    this.scrollCallbacks = [];

    this._bindEvents();
    this._handleResize();
    window.addEventListener('resize', () => this._handleResize());

    this._startRenderLoop();

    // Tilemap and sprites for lua
    this.tilemap = []; // array of {x, y, id}
    this.sprites = []; // array of 32 sprite strings

    // Lua state
    this.L = null; // fengari lua state

    // To allow onUpdate dt timing
    this.lastTime = performance.now();
    this.luaRunning = false;
  }

  _bindEvents() {
    window.addEventListener('keydown', e => {
      this.keys.add(e.key);
      if (this.keyCallbacks[e.key]) this.keyCallbacks[e.key]();
      for (const cb of this.anyKeyCallbacks) cb(e.key, e);

    });

    window.addEventListener('keyup', e => {
      this.keys.delete(e.key);
    });

    this.mouseDown = false;
    this.mousePos = { x: 0, y: 0 };
    this.mouseCallbacks = { down: [], move: [], up: [] };

    this.canvas.addEventListener('mousedown', e => {
      const pos = this._getMouseCoords(e);
      this.mouseDown = true;
      this.mousePos = pos;
      for (const cb of this.mouseCallbacks.down) cb(pos.x, pos.y, 'down');
    });

    this.canvas.addEventListener('mousemove', e => {
      const pos = this._getMouseCoords(e);
      this.mousePos = pos;
      if (this.mouseDown) {
        for (const cb of this.mouseCallbacks.move) cb(pos.x, pos.y, 'move');
      }
    });

    this.canvas.addEventListener('mouseup', e => {
      const pos = this._getMouseCoords(e);
      this.mouseDown = false;
      this.mousePos = pos;
      for (const cb of this.mouseCallbacks.up) cb(pos.x, pos.y, 'up');
    });

    this.canvas.addEventListener('click', e => {
      const pos = this._getMouseCoords(e);
      for (const { sx, sy, ex, ey, callback } of this.clickCallbacks) {
        if (pos.x >= sx && pos.x <= ex && pos.y >= sy && pos.y <= ey) {
          callback(pos.x, pos.y);
        }
      }
    });

    window.addEventListener('wheel', e => {
      let direction = e.deltaY < 0 ? 'up' : 'down';
      let speed = Math.abs(e.deltaY);
      for (const cb of this.scrollCallbacks) {
        cb(direction, speed);
      }
    }, { passive: true });
  }
  _handleResize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    const scaleX = Math.floor(window.innerWidth / this.width);
    const scaleY = Math.floor(window.innerHeight / this.height);
    this.scale = Math.max(1, Math.min(scaleX, scaleY));

    this.renderWidth = this.width * this.scale;
    this.renderHeight = this.height * this.scale;
    this.offsetX = Math.floor((window.innerWidth - this.renderWidth) / 2);
    this.offsetY = Math.floor((window.innerHeight - this.renderHeight) / 2);
  }

  _startRenderLoop() {
    const render = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(
        this.buffer,
        0, 0, this.width, this.height,
        this.offsetX, this.offsetY, this.renderWidth, this.renderHeight
      );
      if(this.luaRunning) {
        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        try {
          this._callLuaUpdate(dt);
        } catch(e) {
          console.error("Lua onUpdate error:", e);
          this.luaRunning = false;
        }
      }
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }
  _getMouseCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - rect.left - this.offsetX) / this.scale),
      y: Math.floor((e.clientY - rect.top - this.offsetY) / this.scale)
    };
  }

  onMouse(callback) {
    if (typeof callback === 'function') {
      this.mouseCallbacks.down.push(callback);
      this.mouseCallbacks.move.push(callback);
      this.mouseCallbacks.up.push(callback);
    }
  }

  onMouseDown(callback) {
    if (typeof callback === 'function') this.mouseCallbacks.down.push(callback);
  }

  onMouseMove(callback) {
    if (typeof callback === 'function') this.mouseCallbacks.move.push(callback);
  }

  onMouseUp(callback) {
    if (typeof callback === 'function') this.mouseCallbacks.up.push(callback);
  }

  clear(paletteIndex = 0) {
    const color = this.palette[paletteIndex] || '#000000';
    this.bctx.fillStyle = color;
    this.bctx.fillRect(0, 0, this.width, this.height);
  }

  drawPixel(x, y, paletteIndex = 7) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const color = this.palette[paletteIndex] || '#FFFFFF';
    this.bctx.fillStyle = color;
    this.bctx.fillRect(x, y, 1, 1);
  }

  drawRect(x, y, w, h, paletteIndex = 7) {
    const color = this.palette[paletteIndex] || '#FFFFFF';
    this.bctx.fillStyle = color;
    this.bctx.fillRect(x, y, w, h);
  }

  drawLine(x1, y1, x2, y2, paletteIndex = 7) {
    const color = this.palette[paletteIndex] || '#FFFFFF';
    this.bctx.strokeStyle = color;
    this.bctx.beginPath();
    this.bctx.moveTo(x1 + 0.5, y1 + 0.5);
    this.bctx.lineTo(x2 + 0.5, y2 + 0.5);
    this.bctx.stroke();
  }

  drawPolygon(points = [], paletteIndex = 7) {
    if (points.length < 2) return;
    const color = this.palette[paletteIndex] || '#FFFFFF';
    this.bctx.fillStyle = color;
    this.bctx.beginPath();
    this.bctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      this.bctx.lineTo(points[i][0], points[i][1]);
    }
    this.bctx.closePath();
    this.bctx.fill();
  }

  drawImage(img, x, y, w = img.width, h = img.height) {
    this.bctx.imageSmoothingEnabled = false;
    this.bctx.drawImage(img, x, y, w, h);
  }

  drawText(text, x, y, scale = 1, paletteIndex = 7) {
    if (!this.fontLoaded) return;
    const charWidth = 8;
    const charHeight = 8;

    const temp = document.createElement('canvas');
    temp.width = charWidth;
    temp.height = charHeight;
    const tctx = temp.getContext('2d');
    tctx.imageSmoothingEnabled = false;

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);

      if (code === 32) {
        // Space: just skip drawing but advance position
        continue;
      }

      if (code < 33 || code > 126) continue;

      const charIndex = code - 33;
      const sx = (charIndex % 16) * charWidth;
      const sy = Math.floor(charIndex / 16) * charHeight;

      tctx.clearRect(0, 0, charWidth, charHeight);
      tctx.drawImage(this.fontAtlas, sx, sy, charWidth, charHeight, 0, 0, charWidth, charHeight);

      const imageData = tctx.getImageData(0, 0, charWidth, charHeight).data;

      for (let py = 0; py < charHeight; py++) {
        for (let px = 0; px < charWidth; px++) {
          const index = (py * charWidth + px) * 4;
          const alpha = imageData[index + 3];
          if (alpha > 128) {
            for (let dx = 0; dx < scale; dx++) {
              for (let dy = 0; dy < scale; dy++) {
                this.drawPixel(
                  x + i * charWidth * scale + px * scale + dx,
                  y + py * scale + dy,
                  paletteIndex
                );
              }
            }
          }
        }
      }
    }
  }

  onClick(sx, sy, ex, ey, callback) {
    this.clickCallbacks.push({ sx, sy, ex, ey, callback });
  }

  onKey(key, callback) {
    this.keyCallbacks[key] = callback;
  }

  onAnyKey(callback) {
    if (typeof callback === 'function') {
      this.anyKeyCallbacks.push(callback);
    }
  }

  onScroll(callback) {
    if (typeof callback === 'function') {
      this.scrollCallbacks.push(callback);
    }
  }

  isKeyDown(key) {
    return this.keys.has(key);
  }

  // === New Method 1: drawImageFromString ===
  /**
   * Draws a pixel image from a custom string format:
   * The string is space-separated numbers:
   * first two numbers = width and height
   * followed by width*height palette indexes.
   * Example: "3 2 0 1 2 3 4 5" means 3x2 image with pixels indexes [0,1,2,3,4,5]
   * 
   * @param {string} imgStr - The image string format.
   * @param {number} x - x coordinate on canvas buffer.
   * @param {number} y - y coordinate on canvas buffer.
   * @param {number} scale - scale multiplier (integer).
   */
drawImageFromString(imgStr, x, y, scale = 1) {
  if (!imgStr) return;
  const parts = imgStr.trim().split(/\s+/).map(Number);
  if (parts.length < 2) return;
  const w = parts[0];
  const h = parts[1];
  const pixels = parts.slice(2);
  if (pixels.length < w * h) return;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const paletteIndex = pixels[py * w + px];
      if (paletteIndex < 0 || paletteIndex >= this.palette.length) continue;
      if (paletteIndex === 0) continue; // skip transparent pixels only
      const color = this.palette[paletteIndex];
      this.bctx.fillStyle = color;
      this.bctx.fillRect(x + px * scale, y + py * scale, scale, scale);
    }
  }
}

  drawImageFromSpriteAtlas(index, x, y, scale = 1) {
    if (index < 0 || index >= this.sprites.length) return;
    const spriteStr = this.sprites[index];
    this.drawImageFromString(spriteStr, x, y, scale);
  }

  // === New Methods for Lua integration ===

  /**
   * Sets sprites data from array of 32 sprite strings
   * Each sprite string is the same format as drawImageFromString expects.
   * @param {string[]} sprites32
   */
  setSprites(sprites32) {
    if (!Array.isArray(sprites32) || sprites32.length !== 32) {
      throw new Error('sprites must be an array of exactly 32 strings');
    }
    this.sprites = sprites32;
  }

  /**
   * Sets the tilemap data.
   * tilemap is an array of { x, y, id } where id is 0..31 (sprite index)
   * @param {Array} tilemap
   */
  setTilemap(tilemap) {
    if (!Array.isArray(tilemap)) throw new Error('tilemap must be an array');
    this.tilemap = tilemap;
  }

  /**
   * Draw tilemap to the buffer, using the sprites data.
   * Each tile draws sprite at tile.x * tileSize, tile.y * tileSize.
   * Tile size is assumed equal to sprite width.
   */
  drawTilemap(scale = 1,ox,oy) {
    const tileSize = 8;

    for (const tile of this.tilemap) {
      if (tile.sprite < 0 || tile.sprite >= this.sprites.length) continue;
      const spriteStr = this.sprites[tile.sprite];
      this.drawImageFromString(spriteStr, tile.x * tileSize * scale+ox, tile.y * tileSize * scale+oy, scale);
    }
  }

  /**
   * Get tile data at given tile x,y.
   * Returns tile object or null.
   * @param {number} x
   * @param {number} y
   */
  getTile(x, y) {
    for (const tile of this.tilemap) {
      if (tile.x === x && tile.y === y) return { ...tile };
    }
    return null;
  }

  /**
   * Set tile data at given tile x,y to a new id.
   * If no tile exists at x,y, adds a new one.
   * @param {number} x
   * @param {number} y
   * @param {number} id
   */
  setTile(x, y, id) {
    if (id < 0 || id >= this.sprites.length) throw new Error('Invalid sprite id');
    for (const tile of this.tilemap) {
      if (tile.x === x && tile.y === y) {
        tile.id = id;
        return;
      }
    }
    // Not found, add new
    this.tilemap.push({ x, y, id });
  }

  /**
   * Initialize Lua environment and run script.
   * Script must define onStart() and onUpdate(dt).
   * Exposes bob16 instance methods to Lua as 'bob'.
   * Also exposes tilemap get/set functions.
   * @param {string} luaCode 
   */
  
    run(spriteAtlas, luaCode, tilemapData) {
  if (typeof fengari === 'undefined') {
    throw new Error('Fengari (Lua VM) not loaded. Please include fengari.js in your HTML.');
  }



  // Create a new Lua state
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);  
  this.L = L;

  // Push bob16 API as global Lua table
  const pushBob16API = () => {
    lua.lua_newtable(L);

    const pushJSFunc = (name, fn) => {
      lua.lua_pushstring(L, to_luastring(name));
      lua.lua_pushjsfunction(L, fn);
      lua.lua_settable(L, -3);
    };

    pushJSFunc('clear', (L) => {
      const pidx = lua.lua_tointeger(L, 1);
      this.clear(pidx || 0);
      return 0;
    });

    pushJSFunc('drawPixel', (L) => {
      const x = lua.lua_tointeger(L, 1);
      const y = lua.lua_tointeger(L, 2);
      const idx = lua.lua_tointeger(L, 3) || 7;
      this.drawPixel(x, y, idx);
      return 0;
    });

    pushJSFunc('drawRect', (L) => {
      const x = lua.lua_tointeger(L, 1);
      const y = lua.lua_tointeger(L, 2);
      const w = lua.lua_tointeger(L, 3);
      const h = lua.lua_tointeger(L, 4);
      const idx = lua.lua_tointeger(L, 5) || 7;
      this.drawRect(x, y, w, h, idx);
      return 0;
    });

    pushJSFunc('drawLine', (L) => {
      const x1 = lua.lua_tointeger(L, 1);
      const y1 = lua.lua_tointeger(L, 2);
      const x2 = lua.lua_tointeger(L, 3);
      const y2 = lua.lua_tointeger(L, 4);
      const idx = lua.lua_tointeger(L, 5) || 7;
      this.drawLine(x1, y1, x2, y2, idx);
      return 0;
    });

    pushJSFunc('drawImage', (L) => {
      const index = lua.lua_tointeger(L, 1);
      const x = lua.lua_tointeger(L, 2);
      const y = lua.lua_tointeger(L, 3);
      const scale = lua.lua_tointeger(L, 4) || 1;
      this.drawImageFromSpriteAtlas(index, x, y, scale);
      return 0;
    });

    pushJSFunc('drawTilemap', (L) => {
      const scale = lua.lua_isinteger(L, 1) ? lua.lua_tointeger(L, 1) : 1;
      const ox = lua.lua_isinteger(L, 2) ? lua.lua_tointeger(L, 2) : 0;
      const oy = lua.lua_isinteger(L, 3) ? lua.lua_tointeger(L, 3) : 0;
      this.drawTilemap(scale, ox, oy);
      return 0;
    });






    pushJSFunc('getTile', (L) => {
      const x = lua.lua_tointeger(L, 1);
      const y = lua.lua_tointeger(L, 2);
      const tile = this.getTile(x, y);
      if (tile) {
        lua.lua_newtable(L);
        lua.lua_pushstring(L, to_luastring('x'));
        lua.lua_pushinteger(L, tile.x);
        lua.lua_settable(L, -3);
        lua.lua_pushstring(L, to_luastring('y'));
        lua.lua_pushinteger(L, tile.y);
        lua.lua_settable(L, -3);
        lua.lua_pushstring(L, to_luastring('id'));
        lua.lua_pushinteger(L, tile.id);
        lua.lua_settable(L, -3);
        return 1;
      }
      lua.lua_pushnil(L);
      return 1;
    });

    pushJSFunc('setTile', (L) => {
      const x = lua.lua_tointeger(L, 1);
      const y = lua.lua_tointeger(L, 2);
      const id = lua.lua_tointeger(L, 3);
      this.setTile(x, y, id);
      return 0;
    });


    pushJSFunc('isKeyDown', (L) => {
      const key = fengari.to_jsstring(lua.lua_tostring(L, 1));
      lua.lua_pushboolean(L, this.isKeyDown(key));
      return 1;
    });

    return 1;
  };

  // Register bob16 API as global 'bob16'
  lua.lua_pushglobaltable(L);
  pushBob16API();
  lua.lua_setfield(L, -2, to_luastring('bob16'));
  lua.lua_pop(L, 1);

  // Set global 'sprites' table
  lua.lua_newtable(L);
  for (let i = 0; i < spriteAtlas.length; i++) {
    lua.lua_pushinteger(L, i + 1);
    lua.lua_pushstring(L, to_luastring(spriteAtlas[i]));
    lua.lua_settable(L, -3);
  }
  lua.lua_setglobal(L, to_luastring('sprites'));

  // Set global 'tilemap' table
  
  lua.lua_newtable(L);
  for (let i = 0; i < tilemapData.length; i++) {
      const tile = tilemapData[i];
      console.log(`tilemapData[${i}]`, tile);

      // Push array index (Lua uses 1-based indexing)
      lua.lua_pushinteger(L, i + 1);

      // Create a new Lua table for this tile
      lua.lua_newtable(L);

      // tile.x
      lua.lua_pushstring(L, to_luastring('x'));
      lua.lua_pushinteger(L, tile.x);
      lua.lua_settable(L, -3); // set table['x'] = tile.x

      // tile.y
      lua.lua_pushstring(L, to_luastring('y'));
      lua.lua_pushinteger(L, tile.y);
      lua.lua_settable(L, -3); // set table['y'] = tile.y

      // tile.sprite as 'id'
      lua.lua_pushstring(L, to_luastring('id'));
      lua.lua_pushinteger(L, tile.sprite);
      lua.lua_settable(L, -3); // set table['id'] = tile.sprite

      // Now set the tile table at position i+1 in the root table
      lua.lua_settable(L, -3);
    }
  
  lua.lua_setglobal(L, to_luastring('tilemap'));
  this.setTilemap(tilemapData)
  this.setSprites(spriteAtlas)
  this.clear(0)
  // Load Lua code
  const loadStatus = lauxlib.luaL_loadstring(L, to_luastring(luaCode));
  if (loadStatus !== lua.LUA_OK) {
    const err = fengari.to_jsstring(lua.lua_tostring(L, -1));
    this.clear()
    return err;
    
  }

  // Run Lua code
  const callStatus = lua.lua_pcall(L, 0, 0, 0);
  if (callStatus !== lua.LUA_OK) {
    const err = fengari.to_jsstring(lua.lua_tostring(L, -1));
    throw new Error(`Lua runtime error: ${err}`);
  }

  // Call onStart()
  lua.lua_getglobal(L, to_luastring('onStart'));
  if (lua.lua_type(L, -1) === lua.LUA_TFUNCTION) {
    lua.lua_pcall(L, 0, 0, 0);
  } else {
    lua.lua_pop(L, 1);
    throw new Error("Lua script must define an 'onStart()' function");
  }

  this.luaRunning = true;
  this.lastTime = performance.now();
  return "runnin";
}


  /**
   * Calls Lua onUpdate(dt)
   * @param {number} dt - delta time in seconds
   */
  _callLuaUpdate(dt) {
    const lua = fengari.lua;
    const L = this.L;
    lua.lua_getglobal(L, fengari.to_luastring('onUpdate'));
    if (lua.lua_type(L, -1) === lua.LUA_TFUNCTION) {
      console.log(typeof dt, dt); // Should print "number" and a numeric value
      lua.lua_pushnumber(L, dt);
      const status = lua.lua_pcall(L, 1, 0, 0);
      if (status !== lua.LUA_OK) {
        const err = fengari.to_jsstring(lua.lua_tostring(L, -1));
        console.error('Lua onUpdate error:', err);
      }
    } else {
      lua.lua_pop(L, 1);
    }
  }
}
