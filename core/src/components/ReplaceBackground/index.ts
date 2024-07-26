import { Image, Leafer, Rect, PointerEvent, ZoomEvent } from 'leafer-ui';
import { Controller, IControllerMode } from './controller';
import { getImageWH } from '/@/utils/brower/img';
import { ref } from 'vue';
import { uploadByDataURL } from '../Uploader/ali-oss';
import { transparentUrl } from '../SmartEditor/constants/index';

type IBackgroundFill =
  | {
      type: 'image';
      url: string;
    }
  | {
      type: 'color';
      color: string;
    };

// 替换背景组件
export const useReplaceBackImage = () => {
  let app: Leafer;
  let transparentBackground: Rect;
  let background: Rect;
  let foregroundImage: Image;
  let backController: Controller;
  let foreController: Controller;

  let cacheOssUrl: string;

  // 控制框模式
  const controlMode = ref<IControllerMode>('free');
  // 固定比例大小
  const controlRatio = ref<number>(1);

  // 是否为图片背景
  const isImageBackground = ref(false);

  // 合成中
  const generating = ref(false);

  // 透明图片偏移量
  let trimInfo: { x: number; y: number; width: number; height: number } = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };

  async function init(
    dom: HTMLElement,
    foregroundImageUrl: string,
    config: {
      onScale?: (scale: number) => void;
      onBgChange?: (x, y, width, height) => void;
      padding?: number;
    } = {},
  ) {
    const { onBgChange, padding, onScale } = config;
    const { offsetWidth, offsetHeight } = dom;
    const {
      width: trimWidth,
      height: trimHeight,
      url,
      offset,
    } = await getImageInfo(foregroundImageUrl);

    trimInfo = {
      x: offset.x,
      y: offset.y,
      width: trimWidth,
      height: trimHeight,
    };

    // 原图的尺寸
    const { width: imgWidth, height: imgHeight } = await getImageWH(foregroundImageUrl);

    app = new Leafer({
      view: dom,
      width: offsetWidth,
      height: offsetHeight,
      cursor: {
        stop: false,
      },
    });

    app.config.zoom = {
      min: 0.25,
      max: 5,
    };

    //#region 布局
    const ar = imgWidth / imgHeight;
    const _padding = padding || 80;
    const imgDomWH = getWHbyAr(ar, offsetWidth - _padding * 2, offsetHeight - _padding * 2);

    const imgDomWidth = imgDomWH.width;
    const imgDomHeight = imgDomWH.height;

    const moveX = (offsetWidth - imgDomWidth) / 2;
    const moveY = (offsetHeight - imgDomHeight) / 2;
    const scale = imgDomWidth / imgWidth;

    app.set({
      x: moveX,
      y: moveY,
      scaleX: scale,
      scaleY: scale,
    });
    //#endregion

    // 背景
    transparentBackground = new Rect({
      width: imgWidth,
      height: imgHeight,
      fill: {
        type: 'image',
        mode: 'repeat',
        url: transparentUrl,
      },
    });

    background = new Rect({
      width: imgWidth,
      height: imgHeight,
      fill: 'transparent',
    });
    // 前景图
    foregroundImage = new Image({
      x: offset.x,
      y: offset.y,
      url,
      width: trimWidth,
      height: trimHeight,
      cursor: 'move',
      strokeWidth: 2 / scale,
    });
    // 背景控制器
    backController = new Controller({
      theme: 'back',
      originWidth: imgWidth,
      originHeight: imgHeight,
      vision: app,
      originAr: ar,
      maxWidth: 15360,
      maxHeight: 15360,
      onChange: (x, y, width, height) => {
        cacheOssUrl = undefined;
        onBgChange?.(x, y, width, height);
        if (!isImageBackground.value) {
          transparentBackground.set({
            x,
            y,
            width,
            height,
          });
          background.set({
            x,
            y,
            width,
            height,
          });
        }
      },
    });
    // 前景控制器
    foreController = new Controller({
      theme: 'fore',
      originX: offset.x,
      originY: offset.y,
      originWidth: trimWidth,
      originHeight: trimHeight,
      mode: 'origin',
      vision: app,
      originAr: trimWidth / trimHeight,
      maxWidth: 15360,
      maxHeight: 15360,
      onChange: (x, y, width, height) => {
        cacheOssUrl = undefined;
        foregroundImage.set({
          x,
          y,
          width,
          height,
        });
      },
    });
    foreController.set({
      visible: false,
    });

    // 依次将元素加入画布
    app.add(transparentBackground);
    app.add(background);
    app.add(foregroundImage);
    app.add(backController);
    app.add(foreController);

    app.on(PointerEvent.DOWN, (e) => {
      if (!e.left) return;
      if (backController.pointerKeys.includes(e.target.name)) {
        return;
      }
      const point = { x: e.x, y: e.y };
      foregroundImage.worldToInner(point);
      // 如果用户点击前景图区域，则显示前景图控制器
      const xx = Math.ceil(point.x);
      const yy = Math.ceil(point.y);
      const showForeController =
        xx >= 0 && xx <= foregroundImage.width && yy >= 0 && yy <= foregroundImage.height;
      backController.set({
        visible: !showForeController,
      });
      foreController.set({
        visible: showForeController,
      });
    });
    app.on(PointerEvent.MOVE, (e) => {
      const point = { x: e.x, y: e.y };
      foregroundImage.worldToInner(point);
      // 如果用户点击前景图区域，则显示前景图控制器
      const xx = Math.ceil(point.x);
      const yy = Math.ceil(point.y);
      const showHover =
        xx >= 0 && xx <= foregroundImage.width && yy >= 0 && yy <= foregroundImage.height;

      foregroundImage.set({
        stroke: showHover ? '#00EBA5' : undefined,
      });
    });
    app.on(ZoomEvent.ZOOM, () => {
      onScale?.(app.scaleX);
    });
    onScale?.(app.scaleX);
  }

  function destroy() {
    app?.destroy();
    app = undefined;
    cacheOssUrl = undefined;
    controlMode.value = 'free';
    controlRatio.value = 1;
    isImageBackground.value = false;
    generating.value = false;
    trimInfo = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }

  async function setBackGround(fill: IBackgroundFill) {
    cacheOssUrl = undefined;
    isImageBackground.value = fill.type === 'image';
    if (fill.type === 'image') {
      const { x, y, width, height } = await getImagePositionInfo(fill.url, backController);
      transparentBackground.set({
        x,
        y,
        width,
        height,
      });
      background.set({ fill, x, y, width, height });
    } else {
      transparentBackground.set({
        x: backController.frameX,
        y: backController.frameY,
        width: backController.frameWidth,
        height: backController.frameHeight,
      });
      background.set({
        fill: fill.color,
        x: backController.frameX,
        y: backController.frameY,
        width: backController.frameWidth,
        height: backController.frameHeight,
      });
    }
  }

  function setBackControlMode(mode: IControllerMode, ratio?: number) {
    controlMode.value = mode;
    controlRatio.value = ratio || controlRatio.value;
    backController.setControllerMode(controlMode.value, controlRatio.value);
  }

  function setBackControlWH(width: number, height: number) {
    backController.setFrameWidth(width);
    backController.setFrameHeight(height);
  }

  async function gainImage(
    config: {
      uploadOss: boolean;
    } = {
      uploadOss: false,
    },
  ): Promise<string> {
    if (cacheOssUrl && config.uploadOss) {
      return cacheOssUrl;
    }
    generating.value = true;
    const { frameX, frameY, frameWidth, frameHeight } = backController;

    const canvas = document.createElement('canvas');
    canvas.width = frameWidth;
    canvas.height = frameHeight;
    const ctx = canvas.getContext('2d')!;
    // 绘制背景图
    if (background.fill?.type === 'image') {
      if (background.fill?.url !== transparentUrl) {
        const { img } = await getImageWH(background.fill!.url);
        ctx.drawImage(
          img,
          background.x - frameX,
          background.y - frameY,
          background.width,
          background.height,
        );
      }
    } else {
      ctx.fillStyle = background.fill as string;
      ctx.fillRect(0, 0, frameWidth, frameHeight);
    }

    if (foregroundImage.url) {
      const { img } = await getImageWH(foregroundImage.url);
      // 绘制前景图
      ctx.drawImage(
        img,
        foregroundImage.x - frameX,
        foregroundImage.y - frameY,
        foregroundImage.width,
        foregroundImage.height,
      );
    }

    const dataURL = canvas.toDataURL('image/png', 1);
    if (config.uploadOss) {
      cacheOssUrl = await uploadByDataURL(dataURL);
      return cacheOssUrl;
    }
    return dataURL;
  }

  // 获取前景图与后景图尺寸比例以及相位差
  function gainInfo() {
    const { x: foreX, y: foreY, width: foreWidth } = foregroundImage;
    const {
      frameX: backX,
      frameY: backY,
      frameWidth: backWidth,
      frameHeight: backHeight,
    } = backController;
    const { fill } = background;
    const { x: trimX, y: trimY, width: trimWidth } = trimInfo;
    // 缩放倍数
    const scale = foreWidth / trimWidth;
    // 计算在为裁切尺寸下，前景图相对原点的 offset
    const frontOffsetX = foreX - trimX * scale;
    const frontOffsetY = foreY - trimY * scale;
    // 计算前景相对于后景图的偏移量
    const offsetX = (frontOffsetX - backX) / scale;
    const offsetY = (frontOffsetY - backY) / scale;

    // 计算在原图缩放倍数下，后景图的尺寸大小
    const bgWidth = backWidth / scale;
    const bgHeight = backHeight / scale;

    return {
      offset: {
        x: offsetX,
        y: offsetY,
      },
      backgroundInfo: {
        width: bgWidth,
        height: bgHeight,
        fill,
      },
      scale,
    };
  }

  function getCacheInfo() {
    return {
      fore: {
        x: foregroundImage.x,
        y: foregroundImage.y,
        width: foregroundImage.width,
        height: foregroundImage.height,
      },
      back: {
        x: backController.frameX,
        y: backController.frameY,
        width: backController.frameWidth,
        height: backController.frameHeight,
        fill: background.fill,
      },
    };
  }

  function setBackgroundByInfo(info) {
    const { back, fore } = info;
    transparentBackground.set({
      x: back.x,
      y: back.y,
      width: back.width,
      height: back.height,
    });
    background.set(back);
    backController.setPhase(back.x, back.y, back.width, back.height);
    foregroundImage.set(fore);
    foreController.setPhase(fore.x, fore.y, fore.width, fore.height);
  }

  function scaleTo(scale: number) {
    app.set({
      scaleX: scale,
      scaleY: scale,
    });
  }

  function setPointerEvent(pointerEvents: string) {
    (<HTMLCanvasElement>app.view).style['pointer-events'] = pointerEvents;
  }

  return {
    init,
    destroy,
    setBackGround,
    gainImage,
    setBackControlMode,
    controlMode,
    controlRatio,
    gainInfo,
    setBackControlWH,
    getCacheInfo,
    setBackgroundByInfo,
    scaleTo,
    setPointerEvent,
  };
};

// 获取图片背景的相位、宽高信息
async function getImagePositionInfo(url: string, controller: Controller) {
  let x,
    y,
    width,
    height = 0;
  const { frameX, frameY, frameWidth, frameHeight } = controller;
  const { width: imgWidth, height: imgHeight } = await getImageWH(url);
  const imgAr = imgWidth / imgHeight;
  const frameAr = frameWidth / frameHeight;

  if (imgAr < frameAr) {
    // 控制框宽高比更大，图片以控制框宽度为准
    width = frameWidth;
    height = width / imgAr;
    x = frameX;
    y = frameY - (height - frameHeight) / 2;
  } else {
    // 控制框宽高比更小，图片以控制框高度为准
    height = frameHeight;
    width = height * imgAr;
    y = frameY;
    x = frameX - (width - frameWidth) / 2;
  }

  return {
    x,
    y,
    width,
    height,
  };
}

function getWHbyAr(ar, wrapperWidth, wrapperHeight) {
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

function getImageData(img: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

/**
 * 对 imageData 透明部分进行裁切
 * @param imageData 原 imageData
 * @returns 裁切后的 imageData 以及相对原始数据的相位偏移量
 */
function trimTransparentPixels(imageData): {
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

function getUrlByImageData(imageData) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  context.putImageData(imageData, 0, 0);
  // 将 canvas 转换为数据 URL
  const dataURL = canvas.toDataURL('image/png', 1);
  return dataURL;
}

async function getImageInfo(url: string): Promise<{
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
  img.crossOrigin = 'Anonymous';
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
