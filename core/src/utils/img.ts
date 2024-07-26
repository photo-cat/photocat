// 获取图片宽高
export function getImageWH(url): Promise<{
  width: number;
  height: number;
  img: HTMLImageElement;
}> {
  const img = new Image();

  img.src = url;
  img.crossOrigin = "Anonymous";
  return new Promise((resolve, reject) => {
    try {
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          img,
        });
      };
    } catch (e) {
      console.error(e);
      reject(e);
    }
  });
}

// 获取图片大小
export function getImageSize(url): Promise<Number> {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "blob";
      xhr.onload = () => {
        const size = xhr.response.size;
        resolve(size);
      };
      xhr.send();
    } catch (e) {
      reject(e);
    }
  });
}

export async function createImageByColor(color, width, height) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    img.src = canvas.toDataURL("image/png");
    img.onload = () => {
      resolve(img);
    };

    img.onerror = reject;
  });
}

export async function getImageDataByUrl(url: string) {
  const img = new window.Image();
  img.src = url;
  img.crossOrigin = "anonymous";
  return new Promise((resolve) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0);
      const imageData = context.getImageData(0, 0, img.width, img.height);
      resolve(imageData);
    };
  });
}

export function getWHbyAr(ar, wrapperWidth, wrapperHeight) {
  let width = 1000;
  let height = 600;

  if (ar > 1) {
    // 宽大于高
    const w = wrapperWidth;
    const h = wrapperWidth / ar;
    if (h > wrapperHeight) {
      height = wrapperHeight;
      width = wrapperHeight * ar;
    } else {
      height = h;
      width = w;
    }
  } else {
    // 高大于宽
    const h = wrapperHeight;
    const w = wrapperHeight * ar;
    if (w > wrapperWidth) {
      width = wrapperWidth;
      height = wrapperWidth / ar;
    } else {
      width = w;
      height = h;
    }
  }

  return {
    width,
    height,
  };
}

export function dataURLtoFile(dataURL, fileName: string) {
  let arr = dataURL.split(","),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], fileName, { type: mime });
}

export function dataURItoBlob(dataURI) {
  const byteString = atob(dataURI.split(",")[1]);
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], { type: mimeString });
}

export function imageDataToUrl(imageData) {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL(); // 默认为 'image/png' 格式
}

export function urlToImageData(url) {
  return new Promise<ImageData>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // 请求CORS权限
    img.onload = function () {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      canvas.height = img.naturalHeight;
      canvas.width = img.naturalWidth;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve(imageData);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function getImageData(img: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

/**
 * 对 imageData 透明部分进行裁切
 * @param imageData 原 imageData
 * @returns 裁切后的 imageData 以及相对原始数据的相位偏移量
 */
export function trimTransparentPixels(imageData): {
  imageData: ImageData;
  offset: { x: number; y: number };
} {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  // 找到有色值像素的边界
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];

      if (alpha !== 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const trimmedWidth = maxX - minX + 1;
  const trimmedHeight = maxY - minY + 1;

  // 兜底逻辑，空白图层可能出现负数问题
  if (trimmedWidth <= 0 || trimmedHeight <= 0) {
    return {
      imageData: null,
      offset: {
        x: 0,
        y: 0,
      },
    };
  }

  const trimmedImageData = new ImageData(trimmedWidth, trimmedHeight);
  const trimmedData = trimmedImageData.data;

  // 复制有色值部分到裁剪后的 ImageData 对象中
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const srcIndex = (y * width + x) * 4;
      const dstIndex = ((y - minY) * trimmedWidth + (x - minX)) * 4;

      trimmedData[dstIndex] = data[srcIndex];
      trimmedData[dstIndex + 1] = data[srcIndex + 1];
      trimmedData[dstIndex + 2] = data[srcIndex + 2];
      trimmedData[dstIndex + 3] = data[srcIndex + 3];
    }
  }

  return {
    imageData: trimmedImageData,
    offset: {
      x: minX,
      y: minY,
    },
  };
}

export function getUrlByImageData(imageData) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  context.putImageData(imageData, 0, 0);
  // 将 canvas 转换为数据 URL
  const dataURL = canvas.toDataURL("image/png", 1);
  return dataURL;
}

export async function getImageAABB(url: string): Promise<{
  width: number;
  height: number;
  url?: string;
  offset: {
    x: number;
    y: number;
  };
}> {
  const img = new window.Image();

  img.src = url;
  img.crossOrigin = "Anonymous";
  return new Promise((resolve, reject) => {
    try {
      img.onload = () => {
        const { imageData, offset } = trimTransparentPixels(getImageData(img));
        resolve({
          width: imageData?.width || 0,
          height: imageData?.height || 0,
          url: imageData ? getUrlByImageData(imageData) : undefined,
          offset,
        });
      };
    } catch (e) {
      reject(e);
    }
  });
}
