//editor is bundled in one file for speed of loading 
//bob16 editor by-maksydab
const engine = new bob16({
  width: 160,
  height: 120,
  pixelSize: 4,
  appendTo: document.body,
  fontAtlasSrc: 'https://raw.githubusercontent.com/maksydab/maksydab.github.io/main/an8by8font.png'
});

function getVisibleText(line, scrollX, visibleWidth = 15) {
  const maxScroll = Math.max(0, line.length - visibleWidth);
  scrollX = Math.min(scrollX, maxScroll);
  let visible = line.slice(scrollX, scrollX + visibleWidth);
  return visible.padEnd(visibleWidth, ' ');
}
// UTF8 helpers
function encodeUTF8(str) {
  return new TextEncoder().encode(str);
}
function decodeUTF8(buf) {
  return new TextDecoder().decode(buf);
}
function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for(let i=0; i<len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
function uint8ArrayToBase64(bytes) {
  let binary = '';
  for(let i=0; i<bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function crc32(data) {
  let crc = -1;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if ((crc & 1) !== 0) crc = (crc >>> 1) ^ 0xEDB88320;
      else crc = crc >>> 1;
    }
  }
  return (crc ^ (-1)) >>> 0;
}


const FONT5x7 = {
  ' ': [0x00,0x00,0x00,0x00,0x00,0x00,0x00],
  'A': [0x0E,0x11,0x11,0x1F,0x11,0x11,0x11],
  'B': [0x1E,0x11,0x11,0x1E,0x11,0x11,0x1E],
  'C': [0x0E,0x11,0x10,0x10,0x10,0x11,0x0E],
  'D': [0x1C,0x12,0x11,0x11,0x11,0x12,0x1C],
  'E': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F],
  'F': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x10],
  'G': [0x0E,0x11,0x10,0x17,0x11,0x11,0x0F],
  'H': [0x11,0x11,0x11,0x1F,0x11,0x11,0x11],
  'I': [0x0E,0x04,0x04,0x04,0x04,0x04,0x0E],
  'J': [0x07,0x02,0x02,0x02,0x12,0x12,0x0C],
  'K': [0x11,0x12,0x14,0x18,0x14,0x12,0x11],
  'L': [0x10,0x10,0x10,0x10,0x10,0x10,0x1F],
  'M': [0x11,0x1B,0x15,0x11,0x11,0x11,0x11],
  'N': [0x11,0x19,0x15,0x13,0x11,0x11,0x11],
  'O': [0x0E,0x11,0x11,0x11,0x11,0x11,0x0E],
  'P': [0x1E,0x11,0x11,0x1E,0x10,0x10,0x10],
  'Q': [0x0E,0x11,0x11,0x11,0x15,0x12,0x0D],
  'R': [0x1E,0x11,0x11,0x1E,0x14,0x12,0x11],
  'S': [0x0F,0x10,0x10,0x0E,0x01,0x01,0x1E],
  'T': [0x1F,0x04,0x04,0x04,0x04,0x04,0x04],
  'U': [0x11,0x11,0x11,0x11,0x11,0x11,0x0E],
  'V': [0x11,0x11,0x11,0x11,0x11,0x0A,0x04],
  'W': [0x11,0x11,0x11,0x11,0x15,0x1B,0x11],
  'X': [0x11,0x11,0x0A,0x04,0x0A,0x11,0x11],
  'Y': [0x11,0x11,0x0A,0x04,0x04,0x04,0x04],
  'Z': [0x1F,0x01,0x02,0x04,0x08,0x10,0x1F],
  '0': [0x0E,0x11,0x13,0x15,0x19,0x11,0x0E],
  '1': [0x04,0x0C,0x04,0x04,0x04,0x04,0x0E],
  '2': [0x0E,0x11,0x01,0x06,0x08,0x10,0x1F],
  '3': [0x1F,0x02,0x04,0x02,0x01,0x11,0x0E],
  '4': [0x02,0x06,0x0A,0x12,0x1F,0x02,0x02],
  '5': [0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E],
  '6': [0x06,0x08,0x10,0x1E,0x11,0x11,0x0E],
  '7': [0x1F,0x01,0x02,0x04,0x08,0x08,0x08],
  '8': [0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E],
  '9': [0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C],
};


function drawChar(imageData, width, x, y, char, color, scale=1) {
  char = char.toUpperCase();
  const fontChar = FONT5x7[char];
  if (!fontChar) return; // skip unknown chars
  for (let row=0; row<7; row++) {
    const rowBits = fontChar[row];
    for (let col=0; col<5; col++) {
      const bit = (rowBits >> (4 - col)) & 1;
      if (bit) {
        // Draw scaled pixel block
        for (let sy=0; sy<scale; sy++) {
          for (let sx=0; sx<scale; sx++) {
            const px = x + col*scale + sx;
            const py = y + row*scale + sy;
            if(px >= 0 && px < width && py >= 0 && py < 256) {
              const idx = (py*width + px)*4;
              imageData[idx] = color.r;
              imageData[idx+1] = color.g;
              imageData[idx+2] = color.b;
              imageData[idx+3] = color.a;
            }
          }
        }
      }
    }
  }
}


function drawTextCentered(imageData, width, text, y, color, scale=1) {
  const charWidth = 5*scale;
  const charSpacing = scale*1;
  const totalWidth = text.length * (charWidth + charSpacing) - charSpacing;
  let startX = Math.floor((width - totalWidth)/2);
  for(let i=0; i<text.length; i++) {
    drawChar(imageData, width, startX, y, text[i], color, scale);
    startX += charWidth + charSpacing;
  }
  return totalWidth;
}



function deflateRawRGBA(rgba) {

  const height = 256;
  const width = 256;
  const bytesPerLine = width*4 + 1;
  const rawData = new Uint8Array(bytesPerLine * height);
  for(let y=0; y<height; y++) {
    rawData[y*bytesPerLine] = 0; // filter type 0
    rawData.set(rgba.subarray(y*width*4,(y+1)*width*4), y*bytesPerLine+1);
  }

  const maxBlockSize = 65535;
  let pos = 0;
  const chunks = [];
  
  // zlib header
  chunks.push(0x78, 0x01);
  
  while(pos < rawData.length) {
    const blockSize = Math.min(maxBlockSize, rawData.length - pos);
    const bfinal = (pos + blockSize === rawData.length) ? 1 : 0;

    const header = bfinal | (0 << 1) | (0 << 2);
    chunks.push(header);
    // LEN (2 bytes little endian)
    chunks.push(blockSize & 0xFF);
    chunks.push((blockSize >> 8) & 0xFF);
    // NLEN (1's complement)
    chunks.push((~blockSize) & 0xFF);
    chunks.push(((~blockSize) >> 8) & 0xFF);
    // Block data
    for(let i=0; i<blockSize; i++) {
      chunks.push(rawData[pos + i]);
    }
    pos += blockSize;
  }
  
  return new Uint8Array(chunks);
}

// Make PNG chunk
function makeChunk(typeStr, data) {
  const typeBytes = encodeUTF8(typeStr);
  const length = data.length;
  const chunk = new Uint8Array(4 + 4 + length + 4);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  const crcData = new Uint8Array(typeBytes.length + data.length);
  crcData.set(typeBytes, 0);
  crcData.set(data, typeBytes.length);
  const crc = crc32(crcData);
  view.setUint32(8 + length, crc);
  return chunk;
}

// Create 256x256 PNG with black text centered and embedded metadata JSON
function createPngWithMetadata(metadataString, gameName) {
  const width = 256;
  const height = 256;
  
  // Create RGBA buffer filled with white transparent (or fully white opaque background?)

  const rgba = new Uint8Array(width * height * 4);
  for(let i=0; i<width*height; i++) {
    rgba[i*4] = 255;
    rgba[i*4 + 1] = 255;
    rgba[i*4 + 2] = 255;
    rgba[i*4 + 3] = 255;
  }
  
  // Draw black text centered horizontally, vertically approx middle line (scale 4 to be readable)
  const textColor = {r:0,g:0,b:0,a:255};
  const scale = 2;
  // Text height = 7 pixels * scale = 28 px, position vertically centered:
  const textHeight = 7*scale;
  const y = Math.floor((height - textHeight)/2);
  drawTextCentered(rgba, width, gameName, y, textColor, scale);
  
  // Now build PNG chunks:
  const PNG_HEADER = new Uint8Array([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
  
  // IHDR chunk data:
  const ihdrData = new Uint8Array([
    0x00,0x00,0x01,0x00, // width = 256 (0x0100)
    0x00,0x00,0x01,0x00, // height = 256
    0x08,                // bit depth = 8
    0x06,                // color type = 6 (RGBA)
    0x00,                // compression
    0x00,                // filter
    0x00                 // interlace
  ]);
  const ihdrChunk = makeChunk("IHDR", ihdrData);
  
  // IDAT chunk: zlib compressed image data
  const compressedData = deflateRawRGBA(rgba);
  const idatChunk = makeChunk("IDAT", compressedData);
  
  // tEXt chunk with metadata JSON
  const keyword = "metadata";
  const keywordBytes = encodeUTF8(keyword);
  const textBytes = encodeUTF8(metadataString);
  const textChunkData = new Uint8Array(keywordBytes.length + 1 + textBytes.length);
  textChunkData.set(keywordBytes, 0);
  textChunkData[keywordBytes.length] = 0; // null separator
  textChunkData.set(textBytes, keywordBytes.length + 1);
  const textChunk = makeChunk("tEXt", textChunkData);
  
  // IEND chunk
  const iendChunk = makeChunk("IEND", new Uint8Array(0));
  
  // Combine all parts:
  const totalLength = PNG_HEADER.length + ihdrChunk.length + textChunk.length + idatChunk.length + iendChunk.length;
  const pngBytes = new Uint8Array(totalLength);
  let offset = 0;
  pngBytes.set(PNG_HEADER, offset);
  offset += PNG_HEADER.length;
  pngBytes.set(ihdrChunk, offset);
  offset += ihdrChunk.length;
  pngBytes.set(textChunk, offset);
  offset += textChunk.length;
  pngBytes.set(idatChunk, offset);
  offset += idatChunk.length;
  pngBytes.set(iendChunk, offset);
  
  return uint8ArrayToBase64(pngBytes);
}

function save(sprites, codetabs, lvl, gameName = "Super Game 102") {
  const dataObj = { sprites, codetabs, lvl };
  const jsonString = JSON.stringify(dataObj);
  return createPngWithMetadata(jsonString, gameName);
}


function load() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = "file";
    input.accept = ".png";
    input.onchange = e => {
      const file = input.files[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const arrayBuffer = reader.result;
          const bytes = new Uint8Array(arrayBuffer);
          

          let pos = 8;
          while(pos < bytes.length) {
            if (pos + 8 > bytes.length) break; // not enough data
            const length = (bytes[pos]<<24) | (bytes[pos+1]<<16) | (bytes[pos+2]<<8) | (bytes[pos+3]);
            const type = String.fromCharCode(bytes[pos+4], bytes[pos+5], bytes[pos+6], bytes[pos+7]);
            pos += 8;
            if (pos + length + 4 > bytes.length) break;
            const data = bytes.subarray(pos, pos+length);
            pos += length;
            const crc = (bytes[pos]<<24) | (bytes[pos+1]<<16) | (bytes[pos+2]<<8) | (bytes[pos+3]);
            pos += 4;
            if (type === "tEXt") {
              // Parse text chunk
              const zeroIndex = data.indexOf(0);
              if (zeroIndex > 0) {
                const key = decodeUTF8(data.subarray(0, zeroIndex));
                if (key === "metadata") {
                  const metaString = decodeUTF8(data.subarray(zeroIndex+1));
                  const metaObj = JSON.parse(metaString);
                  // Return parsed data:
                  resolve({
                    sprites: metaObj.sprites,
                    codetabs: metaObj.codetabs,
                    lvl: metaObj.lvl
                  });
                  return;
                }
              }
            }
            if (type === "IEND") break;
          }
          reject(new Error("No metadata found in PNG"));
        } catch (ex) {
          reject(ex);
        }
      };
      reader.onerror = e => {
        reject(new Error("Failed to read file"));
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  });
}

function downloadPng(base64Str,name) {
  const a = document.createElement('a');
  a.href = 'data:image/png;base64,' + base64Str;
  a.download = name+'.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

setTimeout(() => {
const theme = {
  background: 1,
  panelBackground: 1,
  text: 0,
  accent: 8,
  selection: 12,
  border: 8,
  tabInactive: 0,
  tabInactiveText: 3,
  tabActive: 2,
  tabActiveText: 3,
  secondary:3,
  textedit:13
};
  let running =false;
  let curtab = 1;
  let maxtabs = 4;
  let currentcodetab = 0;
  let blink = true;
  setInterval(() => blink = !blink, 500);

  let codeditor = {
    scrollx: 0, scrolly: 0,
    cursorX: 0, cursorY: 0,
    insertMode: true, selection: null,
  };
  let arteditor={
    currentcolor:0,
    currentsprite:0,
    sprites:[
        "8 8 0 2 0 2 0 2 0 2 2 0 2 0 2 0 2 0 0 2 0 2 0 2 0 2 2 0 2 0 2 0 2 0 0 2 0 2 0 2 0 2 2 0 2 0 2 0 2 0 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        "8 8 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",

    ]
  }
  let lvleditor = {
    currentTool: 'brush', // or 'erase'
    currentSprite: 0,
    lvl: [],            // placed tiles: {sprite, x, y}
    camX: 0, camY: 0,
    zoom: 1            // scale factor
  };
  // MULTILINE SUPPORT (array of lines)
  let codetabs = {
    0: [""],
    1: [""],
    2: [""],
    3: [""],
    4: [""],
    5: [""],
    6: [""],
    7: [""]
  };
  let terminalEditor = {
    input: "",
    cursorX: 0,
    blink: true,
  };
  engine.onKey("Tab", () => {
    curtab = (curtab + 1) % (maxtabs + 1);
  });
  //========editor code==========
  engine.onKey("Alt", () => {
    if (curtab === 1) {
      currentcodetab = (currentcodetab + 1) % 8;
      codeditor.cursorX = codetabs[currentcodetab][0].length;
      codeditor.cursorY = 0;
      codeditor.selection = null;
    }
  });

  engine.onKey("Insert", () => {
    codeditor.insertMode = !codeditor.insertMode;
  });
  engine.onKey("Escape",()=>{
    running=false
  })
  


  engine.onKey("Insert", () => {
    codeditor.insertMode = !codeditor.insertMode;
  });
  
  engine.onAnyKey(async (key, e) => {
    if (curtab == 1){
const lines = codetabs[currentcodetab];
  let y = codeditor.cursorY;
  let x = codeditor.cursorX;
  let line = lines[y] || "";
  const key = e.key;

  // Printable character detection (ASCII 32 to 126)
  const isPrintable = key.length === 1 && key.charCodeAt(0) >= 32 && key.charCodeAt(0) <= 126;

  // Helper to clear selection and adjust cursor after delete
  function deleteSelection() {
    if (!codeditor.selection) return false;
    const sel = codeditor.selection;
    if (sel.y1 === sel.y2) {
      const xstart = Math.min(sel.x1, sel.x2);
      const xend = Math.max(sel.x1, sel.x2);
      lines[sel.y1] = lines[sel.y1].slice(0, xstart) + lines[sel.y1].slice(xend);
      codeditor.cursorX = xstart;
      codeditor.cursorY = sel.y1;
      codeditor.selection = null;
      return true;
    } else {
      // Multiline delete
      const ystart = Math.min(sel.y1, sel.y2);
      const yend = Math.max(sel.y1, sel.y2);
      const xstart = sel.y1 < sel.y2 ? sel.x1 : sel.x2;
      const xend = sel.y1 < sel.y2 ? sel.x2 : sel.x1;

      // Merge first line prefix + last line suffix
      const firstLinePrefix = lines[ystart].slice(0, xstart);
      const lastLineSuffix = lines[yend].slice(xend);

      // Remove all lines between ystart and yend
      lines.splice(ystart, yend - ystart + 1, firstLinePrefix + lastLineSuffix);

      codeditor.cursorX = firstLinePrefix.length;
      codeditor.cursorY = ystart;
      codeditor.selection = null;
      return true;
    }
  }

  // Ctrl+C — Copy selected text (multiline)
  if (e.ctrlKey && key.toLowerCase() === "c" && codeditor.selection) {
    e.preventDefault();
    const sel = codeditor.selection;
    const ystart = Math.min(sel.y1, sel.y2);
    const yend = Math.max(sel.y1, sel.y2);
    if (ystart === yend) {
      const xstart = Math.min(sel.x1, sel.x2);
      const xend = Math.max(sel.x1, sel.x2);
      const textToCopy = lines[ystart].slice(xstart, xend);
      try {
        await navigator.clipboard.writeText(textToCopy);
      } catch {}
    } else {
      // Multiline copy
      const textLines = [];
      for (let i = ystart; i <= yend; i++) {
        if (i === ystart) {
          textLines.push(lines[i].slice(sel.x1));
        } else if (i === yend) {
          textLines.push(lines[i].slice(0, sel.x2));
        } else {
          textLines.push(lines[i]);
        }
      }
      const textToCopy = textLines.join("\n");
      try {
        await navigator.clipboard.writeText(textToCopy);
      } catch {}
    }
    return;
  }

  // Ctrl+V — Paste multiline clipboard text
  if (e.ctrlKey && key.toLowerCase() === "v") {
    e.preventDefault();
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        // Delete selection if any before pasting
        if (codeditor.selection) {
          deleteSelection();
          y = codeditor.cursorY;
          x = codeditor.cursorX;
          line = lines[y];
        }

        const clipLines = clipText.split(/\r?\n/);

        if (clipLines.length === 1) {
          // Single line paste
          lines[y] = line.slice(0, x) + clipLines[0] + line.slice(x);
          codeditor.cursorX = x + clipLines[0].length;
        } else {
          // Multiline paste
          const firstLine = line.slice(0, x) + clipLines[0];
          const lastLine = clipLines[clipLines.length - 1] + line.slice(x);

          // Replace current line with firstLine
          lines[y] = firstLine;

          // Insert middle lines between y+1 ... y + clipLines.length - 2
          for (let i = 1; i < clipLines.length - 1; i++) {
            lines.splice(y + i, 0, clipLines[i]);
          }

          // Insert lastLine after the middle lines
          lines.splice(y + clipLines.length - 1, 0, lastLine);

          // Move cursor to end of pasted text
          codeditor.cursorY = y + clipLines.length - 1;
          codeditor.cursorX = clipLines[clipLines.length - 1].length;
        }
      }
    } catch {}
    return;
  }

  // Ctrl+A — Select all lines in current tab
  if (e.ctrlKey && key.toLowerCase() === "a") {
    e.preventDefault();
    if (lines.length > 0) {
      codeditor.selection = {
        x1: 0,
        y1: 0,
        x2: lines[lines.length - 1].length,
        y2: lines.length - 1,
      };
      codeditor.cursorX = lines[lines.length - 1].length;
      codeditor.cursorY = lines.length - 1;
    }
    return;
  }

  // Typing printable characters (including symbols)
  if (isPrintable) {
    if (codeditor.selection) {
      deleteSelection();
      y = codeditor.cursorY;
      x = codeditor.cursorX;
      line = lines[y];
    }
    if (codeditor.insertMode) {
      lines[y] = line.slice(0, x) + key + line.slice(x);
    } else {
      lines[y] = line.slice(0, x) + key + line.slice(x + 1);
    }
    codeditor.cursorX++;
    return;
  }

  // Handle special keys:
  switch (key) {
    case "Backspace":
      if (deleteSelection()) return;
      if (codeditor.cursorX > 0) {
        lines[y] = line.slice(0, x - 1) + line.slice(x);
        codeditor.cursorX--;
      } else if (codeditor.cursorY > 0) {
        const prevLine = lines[codeditor.cursorY - 1];
        codeditor.cursorX = prevLine.length;
        lines[codeditor.cursorY - 1] += line;
        lines.splice(codeditor.cursorY, 1);
        codeditor.cursorY--;
      }
      break;

    case "Delete":
      if (deleteSelection()) return;
      if (codeditor.cursorX < line.length) {
        lines[y] = line.slice(0, x) + line.slice(x + 1);
      } else if (codeditor.cursorY < lines.length - 1) {
        lines[y] = line + lines[y + 1];
        lines.splice(y + 1, 1);
      }
      break;

    case "Enter":
      if (codeditor.selection) {
        deleteSelection();
        y = codeditor.cursorY;
        x = codeditor.cursorX;
        line = lines[y];
      }
      const newLine = line.slice(x);
      lines[y] = line.slice(0, x);
      lines.splice(y + 1, 0, newLine);
      codeditor.cursorX = 0;
      codeditor.cursorY++;
      codeditor.selection = null;
      break;

    case "ArrowLeft":
      if (e.shiftKey && !codeditor.selection) {
        codeditor.selection = { x1: codeditor.cursorX, y1: codeditor.cursorY, x2: codeditor.cursorX, y2: codeditor.cursorY };
      } else if (!e.shiftKey) {
        codeditor.selection = null;
      }
      if (codeditor.cursorX > 0) {
        codeditor.cursorX--;
      } else if (codeditor.cursorY > 0) {
        codeditor.cursorY--;
        codeditor.cursorX = lines[codeditor.cursorY].length;
      }
      if (codeditor.selection) {
        codeditor.selection.x2 = codeditor.cursorX;
        codeditor.selection.y2 = codeditor.cursorY;
      }
      break;

    case "ArrowRight":
      if (e.shiftKey && !codeditor.selection) {
        codeditor.selection = { x1: codeditor.cursorX, y1: codeditor.cursorY, x2: codeditor.cursorX, y2: codeditor.cursorY };
      } else if (!e.shiftKey) {
        codeditor.selection = null;
      }
      if (codeditor.cursorX < line.length) {
        codeditor.cursorX++;
      } else if (codeditor.cursorY < lines.length - 1) {
        codeditor.cursorY++;
        codeditor.cursorX = 0;
      }
      if (codeditor.selection) {
        codeditor.selection.x2 = codeditor.cursorX;
        codeditor.selection.y2 = codeditor.cursorY;
      }
      break;

    case "ArrowUp":
      if (e.shiftKey && !codeditor.selection) {
        codeditor.selection = { x1: codeditor.cursorX, y1: codeditor.cursorY, x2: codeditor.cursorX, y2: codeditor.cursorY };
      } else if (!e.shiftKey) {
        codeditor.selection = null;
      }
      if (codeditor.cursorY > 0) {
        codeditor.cursorY--;
        codeditor.cursorX = Math.min(codeditor.cursorX, lines[codeditor.cursorY].length);
      }
      if (codeditor.selection) {
        codeditor.selection.x2 = codeditor.cursorX;
        codeditor.selection.y2 = codeditor.cursorY;
      }
      break;

    case "ArrowDown":
      if (e.shiftKey && !codeditor.selection) {
        codeditor.selection = { x1: codeditor.cursorX, y1: codeditor.cursorY, x2: codeditor.cursorX, y2: codeditor.cursorY };
      } else if (!e.shiftKey) {
        codeditor.selection = null;
      }
      if (codeditor.cursorY < lines.length - 1) {
        codeditor.cursorY++;
        codeditor.cursorX = Math.min(codeditor.cursorX, lines[codeditor.cursorY].length);
      }
      if (codeditor.selection) {
        codeditor.selection.x2 = codeditor.cursorX;
        codeditor.selection.y2 = codeditor.cursorY;
      }
      break;

    default:
      break;
  }

  

  // Horizontal scroll
  const lineLen = codetabs[currentcodetab][codeditor.cursorY].length;
  codeditor.scrollx = Math.max(0, Math.min(codeditor.cursorX - 14, lineLen - 15));

  // Vertical scroll if needed
  codeditor.scrolly = Math.max(0, codeditor.cursorY - 13);
}else if(curtab==4){
        if (curtab === 4) {
      if (key.length === 1) {
        terminalEditor.input = terminalEditor.input.slice(0, terminalEditor.cursorX) + key + terminalEditor.input.slice(terminalEditor.cursorX);
        terminalEditor.cursorX++;
      } else if (key === "Backspace") {
        if (terminalEditor.cursorX > 0) {
          terminalEditor.input = terminalEditor.input.slice(0, terminalEditor.cursorX - 1) + terminalEditor.input.slice(terminalEditor.cursorX);
          terminalEditor.cursorX--;
        }
      } else if (key === "Delete") {
        terminalEditor.input = terminalEditor.input.slice(0, terminalEditor.cursorX) + terminalEditor.input.slice(terminalEditor.cursorX + 1);
      } else if (key === "ArrowLeft") {
        if (terminalEditor.cursorX > 0) terminalEditor.cursorX--;
      } else if (key === "ArrowRight") {
        if (terminalEditor.cursorX < terminalEditor.input.length) terminalEditor.cursorX++;
      } else if (key === "Enter") {
        // Process terminal command here
        const command = terminalEditor.input.trim();
        if (command === "run") {
          // Collect the sprite atlas from art editor (for now just currentcolor as placeholder)
          const spriteAtlas = arteditor.sprites;

          // Merge 7 code chunks from code editor tabs 0-6 into one big Lua script string
          let fullLuaScript = "";
          for (let i = 0; i <= 6; i++) {
            fullLuaScript += codetabs[i].join("\n") + "\n";
          }

          // Level data from leveleditor (placeholder)
          const levelData = lvleditor.lvl

          // Call run function with all gathered info
          err = engine.run(spriteAtlas, fullLuaScript, levelData);
          running=true;
          console.log(err)
          terminalEditor.input = "";
          terminalEditor.cursorX = 0;
        }else if( command=="save"){
            let userprompt=null;
            while (userprompt==null){
              userprompt=prompt("please enter name of game")
            }

            const pngBase64 = save(arteditor.sprites, codetabs, lvleditor.lvl,userprompt);
            downloadPng(pngBase64,userprompt);
            terminalEditor.input = "";
            terminalEditor.cursorX = 0;
        }else if (command == "load") {
            load().then(data => {
              arteditor.sprites = data.sprites;
              codetabs = data.codetabs;
              lvleditor.lvl = data.lvl;

              terminalEditor.input = "";
              terminalEditor.cursorX = 0;
              curtab=1;
            }).catch(err => {
              console.error("Load failed:", err);
            });
            
          }

         else {
          // You can add other terminal commands here if needed
          terminalEditor.input = "";
          terminalEditor.cursorX = 0;
        }
      }
      return;
    }
}
  });

  // Add mouse support with click-to-move and drag-to-select
  let mouseDown = false;
  engine.onMouse((mx, my, btn) => {
    if (curtab !== 1) return;
    const gx = Math.floor((mx - 1) / 8);
    const gy = Math.floor((my - 1) / 8);

    if (btn === "down") {
      mouseDown = true;
      codeditor.selection = null;
        codeditor.cursorY = Math.min(Math.max(0, codeditor.scrolly + gy), codetabs[currentcodetab].length - 1);
        const lineLength = codetabs[currentcodetab][codeditor.cursorY].length;
        codeditor.cursorX = Math.min(Math.max(0, codeditor.scrollx + gx), lineLength);

      // Start selection on mouse down
      codeditor.selection = {
        x1: codeditor.cursorX,
        y1: codeditor.cursorY,
        x2: codeditor.cursorX,
        y2: codeditor.cursorY,
      };
    } else if (btn === "up") {
      mouseDown = false;
      // finalize selection (selection already updated on move)
    } else if (btn === "move" && mouseDown) {
      // Update selection end while dragging
      codeditor.selection.x2 = codeditor.scrollx + gx;
      codeditor.selection.y2 = codeditor.scrolly + gy;

      // Clamp selection within lines and line length
      const lines = codetabs[currentcodetab];
      codeditor.selection.y2 = Math.min(Math.max(0, codeditor.selection.y2), lines.length - 1);
      const lineLen = lines[codeditor.selection.y2].length;
      codeditor.selection.x2 = Math.min(Math.max(0, codeditor.selection.x2), lineLen);

      // Move cursor with selection endpoint
      codeditor.cursorX = codeditor.selection.x2;
      codeditor.cursorY = codeditor.selection.y2;
    }
  });

  function renderluaedit() {
    engine.clear(theme.background);
    engine.drawRect(1, 1, 120, 118, theme.textedit);
    const drawX = codeditor.cursorX - codeditor.scrollx;
    const drawY = codeditor.cursorY - codeditor.scrolly;
    if (blink && drawX >= 0 && drawX < 15 && drawY >= 0 && drawY < 15) {
      if (codeditor.insertMode)
        engine.drawRect(1 + drawX * 8, 1 + drawY * 8, 1, 8, theme.secondary);
      else
        engine.drawRect(1 + drawX * 8, 1 + drawY * 8, 8, 8, theme.secondary);
    }else if(drawX===15 &&blink && drawX >= 0 && drawY >= 0 && drawY < 15){
      if (codeditor.insertMode)
        engine.drawRect(1 + drawX * 8-1, 1 + drawY * 8, 1, 8, theme.secondary);
      else
        engine.drawRect(1 + drawX * 8, 1 + drawY * 8, 8, 8, theme.secondary);
    }

    const lines = codetabs[currentcodetab];
    for (let i = 0; i < 15; i++) {
      const line = lines[codeditor.scrolly + i] || "";
      // Draw selection background BEFORE text for all visible lines
      if (codeditor.selection) {
        let sel = codeditor.selection;
        const y1 = Math.min(sel.y1, sel.y2);
        const y2 = Math.max(sel.y1, sel.y2);
        const x1 = Math.min(sel.x1, sel.x2);
        const x2 = Math.max(sel.x1, sel.x2);
        const lineIndex = codeditor.scrolly + i;
        if (lineIndex >= y1 && lineIndex <= y2) {
          let startX = 0, endX = 0;
          if (lineIndex === y1 && lineIndex === y2) {
            startX = x1 - codeditor.scrollx;
            endX = x2 - codeditor.scrollx;
          } else if (lineIndex === y1) {
            startX = x1 - codeditor.scrollx;
            endX = line.length - codeditor.scrollx;
          } else if (lineIndex === y2) {
            startX = 0;
            endX = x2 - codeditor.scrollx;
          } else {
            startX = 0;
            endX = line.length - codeditor.scrollx;
          }
          if (endX > startX && endX > 0 && startX < 15) {
            const rectX = 1 + startX * 8;
            const rectWidth = (endX - startX) * 8;
            if (rectWidth > 0)
              engine.drawRect(rectX, 1 + i * 8, rectWidth, 8, theme.selection);
          }
        }
      }
      engine.drawText(getVisibleText(line, codeditor.scrollx), 1, 1 + i * 8, 1, theme.text);
    }

for (let i = 0; i < 7; i++) {
        const tabX = 121;  // 120+1
        const tabY = i * 17;
        const tabWidth = 17;
        const tabHeight = 17;

        if (i !== currentcodetab - 1) {
            engine.drawRect(tabX, tabY, tabWidth, tabHeight, theme.border);
            engine.drawRect(tabX + 1, tabY + 1, tabWidth - 2, tabHeight + 1, theme.panelBackground);
            engine.drawText(String(i + 1), 120 + 3, tabY + 2, 2, theme.text);
        } else {
            engine.drawRect(tabX, tabY, tabWidth, tabHeight, theme.border);
            engine.drawRect(tabX + 1, tabY + 1, tabWidth - 2, tabHeight + 1, theme.secondary);
            engine.drawText(String(i + 1), 120 + 1, tabY + 2, 2, theme.text);
        }

        // Add click handler for this tab
        engine.onClick(tabX, tabY, tabX + tabWidth, tabY + tabHeight, () => {
            currentcodetab = i + 1;
            
        });
    }

  }

  //=========end of editors code===========
  //========lvl editor========
  //format of lvl is an [tilespritid,x,y]
function renderlvleditor() {
  engine.clear(0);

  // === TILEMAP DIMENSIONS ===
  const mapCols = 12;
  const mapRows = 10;
  const tileSize = 8;
  const speed = 0.5;

  // Initialize camera position if not present
  if (typeof lvleditor.camX === "undefined") lvleditor.camX = 0;
  if (typeof lvleditor.camY === "undefined") lvleditor.camY = 0;

  // === HANDLE CAMERA MOVEMENT ===
  if (engine.isKeyDown("ArrowRight")) {
    lvleditor.camX += speed;
  }
  if (engine.isKeyDown("ArrowLeft")) {
    lvleditor.camX -= speed;
    if (lvleditor.camX < 0) lvleditor.camX = 0;
  }
  if (engine.isKeyDown("ArrowDown")) {
    lvleditor.camY += speed;
  }
  if (engine.isKeyDown("ArrowUp")) {
    lvleditor.camY -= speed;
    if (lvleditor.camY < 0) lvleditor.camY = 0;
  }

  // Separate integer and fractional parts of camera
  const camTileX = Math.floor(lvleditor.camX);
  const camTileY = Math.floor(lvleditor.camY);
  const camOffsetX = (lvleditor.camX - camTileX) * tileSize;
  const camOffsetY = (lvleditor.camY - camTileY) * tileSize;

  // === MOUSE-BASED TILE PLACEMENT or DELETION ===
  if (engine.mouseDown && curtab === 3) {
    if (engine.mousePos.y <80){
    const tileX = Math.floor((engine.mousePos.x + lvleditor.camX * tileSize) / tileSize);
    const tileY = Math.floor((engine.mousePos.y + lvleditor.camY * tileSize) / tileSize);

    // Check if Delete key is down
    if (engine.isKeyDown("Delete")) {
      // Delete tile if exists at that position
      const index = lvleditor.lvl.findIndex(t => t.x === tileX && t.y === tileY);
      if (index !== -1) {
        lvleditor.lvl.splice(index, 1);
        // Optionally: console.log("Tile deleted at", tileX, tileY);
      }
    } else {
      // Place or replace tile normally
      const existing = lvleditor.lvl.find(t => t.x === tileX && t.y === tileY);
      if (!existing) {
        lvleditor.lvl.push({
          sprite: arteditor.currentsprite,
          x: tileX,
          y: tileY
        });
      } else {
        const index = lvleditor.lvl.indexOf(existing);
        if (index !== -1) {
          lvleditor.lvl.splice(index, 1);
        }
        lvleditor.lvl.push({
          sprite: arteditor.currentsprite,
          x: tileX,
          y: tileY
        });
      }
    }}
  }

  // === RENDER TILEMAP WITH CAMERA OFFSET ===
  for (let x = 0; x < mapCols; x++) {
    for (let y = 0; y < mapRows; y++) {
      for (let z = 0; z < lvleditor.lvl.length; z++) {
        const tile = lvleditor.lvl[z];
        if (tile.x === x + camTileX && tile.y === y + camTileY) {
          // Draw tiles shifted by fractional camera offset for smooth movement
          engine.drawImageFromString(
            arteditor.sprites[tile.sprite],
            x * tileSize - camOffsetX,
            y * tileSize - camOffsetY,
            1
          );
        }
      }
    }
  }

  // === RENDER SPRITE PICKER ===
  const startX = 1;
  const startY = 80;
  const cols = 10;
  const spriteSize = 8;
  const pixelScale = 1;

  for (let i = 0; i < 32; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const baseX = startX + col * (spriteSize * pixelScale + 2);
    const baseY = startY + row * (spriteSize * pixelScale + 2);

    const borderColor = (arteditor.currentsprite === i) ? theme.border : theme.panelBackground;
    engine.drawRect(
      baseX - 1,
      baseY - 1,
      spriteSize * pixelScale + 2,
      spriteSize * pixelScale + 2,
      borderColor
    );

    for (let px = 0; px < spriteSize; px++) {
      for (let py = 0; py < spriteSize; py++) {
        const colorIndex = getPixel(arteditor.sprites[i], px, py);
        for (let sx = 0; sx < pixelScale; sx++) {
          for (let sy = 0; sy < pixelScale; sy++) {
            engine.drawPixel(
              baseX + px * pixelScale + sx,
              baseY + py * pixelScale + sy,
              colorIndex
            );
          }
        }
      }
    }

    engine.onClick(
      baseX,
      baseY,
      baseX + spriteSize * pixelScale,
      baseY + spriteSize * pixelScale,
      () => {
        if (curtab === 3) {
          arteditor.currentsprite = i;
        }
      }
    );
  }
}




  //=========end of level editor=======
  //=========art editor=========
  // Get pixel palette index at (x,y)
function getPixel(spriteString, x, y) {
  const parts = spriteString.split(' ');
  const w = +parts[0], h = +parts[1];
  if (x < 0 || x >= w || y < 0 || y >= h) throw 'Out of bounds';
  return +parts[2 + y * w + x];
}

// Set pixel at (x,y) to value; returns new sprite string
function setPixel(spriteString, x, y, value) {
  const parts = spriteString.split(' ');
  const w = +parts[0], h = +parts[1];
  if (x < 0 || x >= w || y < 0 || y >= h) throw 'Out of bounds x='+x +" y="+y   ;
  parts[2 + y * w + x] = value.toString();
  return parts.join(' ');
}

function renderarteditor(){
    engine.clear(0)

    // Tools state
    if (typeof arteditor.currentTool === 'undefined') {
        arteditor.currentTool = 'brush'; // default tool
    }

    // Draw color palette (4x8 grid colors)
    for (let i=0;i<32;i++){
        if (arteditor.currentcolor!==i){
            engine.drawRect((i%4)*10+101,Math.floor(i/4)*10+1,8,8,i)
        }else{
            engine.drawRect((i%4)*10+100,Math.floor(i/4)*10,10,10,theme.border)
            engine.drawRect((i%4)*10+101,Math.floor(i/4)*10+1,8,8,i)
        }
        engine.onClick((i%4)*10+101,Math.floor(i/4)*10+1,(i%4)*10+109,Math.floor(i/4)*10+9,()=>{
            if (curtab==2){
                arteditor.currentcolor=i
                arteditor.currentTool = 'brush' // auto switch to brush when picking color
            }
        })
    }

    // Drawing state
    let isDrawing = false;

    function pixelCoordsFromMouse(mx, my) {
        // Convert mouse coords to pixel coords in your 8x8 grid
        // The pixel rectangles start at (8,8) and each pixel is 8x8
        let x = Math.floor((mx - 8) / 8);
        let y = Math.floor((my - 8) / 8);
        if (x < 0 || x >= 8 || y < 0 || y >= 8) return null;
        return { x, y };
    }

    // Handle mouse events for drawing
    engine.onMouseDown((mx, my) => {
      if (curtab!==2) return;
      if (curtab==2)
        {isDrawing = true;
        const p = pixelCoordsFromMouse(mx, my);
        if (p) {
            let colorToUse = arteditor.currentTool === 'eraser' ? 0 : arteditor.currentcolor;
            arteditor.sprites[arteditor.currentsprite] = setPixel(
                arteditor.sprites[arteditor.currentsprite], p.x, p.y, colorToUse
            );
        }}
    });

    engine.onMouseUp(() => {
        isDrawing = false;
    });

    engine.onMouseMove((mx, my) => {
        if (!isDrawing) return;
        if (curtab!==2) return;
        const p = pixelCoordsFromMouse(mx, my);
        if (p) {
            let colorToUse = arteditor.currentTool === 'eraser' ? 0 : arteditor.currentcolor;
            arteditor.sprites[arteditor.currentsprite] = setPixel(
                arteditor.sprites[arteditor.currentsprite], p.x, p.y, colorToUse
            );
        }
    });

    // Draw 8x8 pixel grid with current sprite pixels
  engine.drawRect(7,7,66,66,theme.panelBackground)
  engine.drawRect(8,8,64,64,0)
  // Draw pixels on top, similar to your logic
  for (let x = 0; x < 8; x++) {
          for (let y = 0; y < 8; y++) {
            engine.drawLine(x,y,x,y,theme.accent)

              if (getPixel(arteditor.sprites[arteditor.currentsprite], x, y)==0){continue}
              engine.drawRect(
                  x * 8 + 8,
                  y * 8 + 8,
                  8,
                  8,
                  getPixel(arteditor.sprites[arteditor.currentsprite], x, y)
              );
          }
      }

    // Draw sprite previews below the editor (unchanged)
    const startX = 1;
    const startY = 80;
    const cols = 10;
    const rows = 4;
    const spriteSize = 8;
    const pixelScale = 1; 
    for (let i = 0; i < 32; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);

        const baseX = startX + col * (spriteSize * pixelScale + 2);
        const baseY = startY + row * (spriteSize * pixelScale + 2);

        if (arteditor.currentsprite !== i) {
            engine.drawRect(baseX - 1, baseY - 1, spriteSize * pixelScale + 2, spriteSize * pixelScale + 2, theme.panelBackground);
            for (let px = 0; px < spriteSize; px++) {
                for (let py = 0; py < spriteSize; py++) {
                    const colorIndex = getPixel(arteditor.sprites[i], px, py);
                    for (let sx = 0; sx < pixelScale; sx++) {
                        for (let sy = 0; sy < pixelScale; sy++) {
                            engine.drawPixel(baseX + px * pixelScale + sx, baseY + py * pixelScale + sy, colorIndex);
                        }
                    }
                }
            }
        } else {
            engine.drawRect(baseX - 1, baseY - 1, spriteSize * pixelScale + 2, spriteSize * pixelScale + 2, theme.border);
            for (let px = 0; px < spriteSize; px++) {
                for (let py = 0; py < spriteSize; py++) {
                    const colorIndex = getPixel(arteditor.sprites[i], px, py);
                    for (let sx = 0; sx < pixelScale; sx++) {
                        for (let sy = 0; sy < pixelScale; sy++) {
                            engine.drawPixel(baseX + px * pixelScale + sx, baseY + py * pixelScale + sy, colorIndex);
                        }
                    }
                }
            }
        }

        engine.onClick(
            baseX,
            baseY,
            baseX + spriteSize * pixelScale,
            baseY + spriteSize * pixelScale,
            () => {
                if (curtab === 2) {
                    arteditor.currentsprite = i;
                }
            }
        );
    }

    // Draw tool buttons (eraser and paintbrush) bottom right below palette
    const toolsX = 101; // position below palette (adjust if needed)
    const toolsY = 80;  // below palette
    const toolSize = 16;
    const toolSpacing = 6;

    // Eraser button
    engine.drawRect(toolsX, toolsY, toolSize, toolSize, arteditor.currentTool === 'eraser' ? theme.border : theme.panelBackground);
    engine.drawText("E", toolsX + 4, toolsY + 4,1, arteditor.currentTool === 'eraser' ? theme.text : theme.text);

    engine.onClick(toolsX, toolsY, toolsX + toolSize, toolsY + toolSize, () => {
        if (curtab === 2) {
            arteditor.currentTool = 'eraser';
        }
    });

    // Paintbrush button
    const brushX = toolsX + toolSize + toolSpacing;
    engine.drawRect(brushX, toolsY, toolSize, toolSize, arteditor.currentTool === 'brush' ? theme.border : theme.panelBackground);
    engine.drawText("B", brushX + 4, toolsY + 4,1, arteditor.currentTool === 'brush' ? theme.text : theme.text);

    engine.onClick(brushX, toolsY, brushX + toolSize, toolsY + toolSize, () => {
        if (curtab === 2) {
            arteditor.currentTool = 'brush';
        }
    });
}

//=====end art editor=======
//=====terminal======
//half of terminal logic is in anykey for easier input handling 

  
  function renderTerminal(){
        engine.clear(2)
        engine.drawText("Terminal (type 'run' to execute)", 1, 10, 1, theme.text);
        const inputLine = terminalEditor.input;
        let displayLine = inputLine + (blink ? "_" : " ");
        if (displayLine.length > 30) {
            displayLine = displayLine.slice(-30);
        }
        engine.drawText(displayLine, 1, 20,1, theme.text);
  }
  function update() {

    curtab=Math.max(1,curtab)
    currentcodetab=Math.max(1,currentcodetab)
    if (running){return};
    if (curtab === 1) {
      renderluaedit();
    }else if(curtab ===2){
        renderarteditor();
    }else if(curtab ===3){
      renderlvleditor()
    }
    else{
        renderTerminal()
    }
    const icons=["C","A","L","T"]
    for (let i = 0; i < 4; i++) {
            const tabX = 140;
            const tabY = i * 30;
            const tabWidth = 20;
            const tabHeight = 30;

            if (i !== curtab - 1) {
                engine.drawRect(tabX, tabY, tabWidth, tabHeight, theme.border);
                engine.drawRect(tabX + 1, tabY + 1, tabWidth - 2, tabHeight - 2, theme.panelBackground);
                engine.drawText(icons[i], tabX + 3, tabY + 6, 2, theme.text);
            } else {
                engine.drawRect(tabX, tabY, tabWidth, tabHeight, theme.panelBackground);
                engine.drawRect(tabX + 1, tabY + 1, tabWidth - 2, tabHeight - 2, theme.border);
                engine.drawText(icons[i], tabX + 3, tabY + 6, 2, theme.text);
            }

            engine.onClick(tabX, tabY, tabX + tabWidth, tabY + tabHeight, () => {
                curtab = i + 1;
                
            });
        }
  }

  function renderLoop() {
    update();
    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);
}, 500);
