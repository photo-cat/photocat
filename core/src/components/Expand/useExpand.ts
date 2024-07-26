import { Image, Leafer, Rect, PointerEvent, ZoomEvent } from 'leafer-ui';
import { Controller, IControllerMode } from '../Controller/index';
import { ref } from 'vue';
import { transparentUrl } from '../../constants/index';
import { getImageWH } from '../../utils/img';
import { merge } from 'lodash-es';

// 替换背景组件
export const useExpand = (config = {}) => {
  const c = merge(
    {
      MAX_AREA_WIDTH: 1280,
      MAX_AREA_HEIGHT: 1280,
      MAX_FORE_WIDTH: 1000,
      MAX_FORE_HEIGHT: 1000,
      MIN_FORE_WIDTH: 20,
      MIN_FORE_HEIGHT: 20,
      FORE_BACK_AR: 1.2,
    },
    config,
  );
  console.log(c);
  const MAX_AREA_WIDTH = c.MAX_AREA_WIDTH;
  const MAX_AREA_HEIGHT = c.MAX_AREA_HEIGHT;

  const MAX_FORE_WIDTH = c.MAX_FORE_WIDTH;
  const MAX_FORE_HEIGHT = c.MAX_FORE_HEIGHT;

  const MIN_FORE_WIDTH = c.MIN_FORE_WIDTH;
  const MIN_FORE_HEIGHT = c.MIN_FORE_HEIGHT;

  const FORE_BACK_AR = c.FORE_BACK_AR;

  let app: Leafer;
  let transparentBackground: Rect;
  let background: Rect;
  let foregroundImage: Image;
  let backController: Controller;
  let foreController: Controller;

  let cacheDataUrl: string | undefined;
  let cacheMaskDataUrl: string | undefined;

  // 控制框模式
  const controlMode = ref<IControllerMode>('free');
  // 固定比例大小
  const controlRatio = ref<number>(1);

  // 是否为图片背景
  const isImageBackground = ref(false);

  // 缩放倍数
  const scale = ref(1);
  // 背景尺寸
  const bgWidth = ref(0);
  const bgHeight = ref(0);

  async function getImageWHWithinMax(url: string) {
    const { width, height } = await getImageWH(url);
    if (width > MAX_FORE_WIDTH || height > MAX_FORE_HEIGHT) {
      if (width > height) {
        const scale = MAX_FORE_WIDTH / width;
        return {
          width: MAX_FORE_WIDTH,
          height: Math.ceil(height * scale),
        };
      } else {
        const scale = MAX_FORE_HEIGHT / height;
        return {
          width: Math.ceil(width * scale),
          height: MAX_FORE_HEIGHT,
        };
      }
    }
    return {
      width,
      height,
    };
  }

  async function init(
    dom: HTMLElement,
    foregroundImageUrl: string,
    config: {
      onScale?: (scale: number) => void;
      onBgChange?: (x, y, width, height) => void;
      padding?: number;
    } = {},
  ) {
    const { onBgChange, onScale } = config;
    const { offsetWidth, offsetHeight } = dom;

    // 原图的尺寸
    const { width: imgWidth, height: imgHeight } = await getImageWHWithinMax(foregroundImageUrl);

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
    const { width: _width, height: _height } = getWHbyAr(1, dom);
    const moveX = (offsetWidth - _width) / 2;
    const moveY = (offsetHeight - _height) / 2;

    const containerAr = offsetWidth / offsetHeight;
    const _scale = containerAr > 1 ? offsetHeight / MAX_AREA_HEIGHT : offsetWidth / MAX_AREA_WIDTH;

    app.set({
      x: moveX,
      y: moveY,
      scaleX: _scale,
      scaleY: _scale,
    });
    //#endregion

    // 最大范围显示
    background = new Rect({
      x: 0,
      y: 0,
      width: MAX_AREA_WIDTH,
      height: MAX_AREA_HEIGHT,
      fill: '#1f1f1f',
      stroke: 'rgba(255, 255, 255, 0.12)',
      strokeWidth: 4,
      dashPattern: [40, 40],
    });

    const backOffsetX = Math.ceil((MAX_AREA_WIDTH - imgWidth * FORE_BACK_AR) / 2);
    const backOffsetY = Math.ceil((MAX_AREA_HEIGHT - imgHeight * FORE_BACK_AR) / 2);

    const foreOffsetX = Math.ceil(backOffsetX + imgWidth * ((FORE_BACK_AR - 1) / 2));
    const foreOffsetY = Math.ceil(backOffsetY + imgHeight * ((FORE_BACK_AR - 1) / 2));

    // 后景图
    transparentBackground = new Rect({
      x: backOffsetX,
      y: backOffsetY,
      width: Math.ceil(imgWidth * FORE_BACK_AR),
      height: Math.ceil(imgHeight * FORE_BACK_AR),
      fill: {
        type: 'image',
        mode: 'repeat',
        url: transparentUrl,
      },
    });

    // 前景图
    foregroundImage = new Image({
      x: foreOffsetX,
      y: foreOffsetY,
      url: foregroundImageUrl,
      width: imgWidth,
      height: imgHeight,
      cursor: 'move',
      strokeWidth: 2 / _scale,
    });

    // 背景控制器
    backController = new Controller({
      theme: 'back',
      originX: backOffsetX,
      originY: backOffsetY,
      originWidth: Math.ceil(imgWidth * FORE_BACK_AR),
      originHeight: Math.ceil(imgHeight * FORE_BACK_AR),
      vision: app,
      originAr: imgWidth / imgHeight,
      maxWidth: MAX_AREA_WIDTH,
      maxHeight: MAX_AREA_HEIGHT,
      onChange: (x, y, width, height) => {
        cacheDataUrl = undefined;
        cacheMaskDataUrl = undefined;
        onBgChange?.(x, y, width, height);
        bgWidth.value = width;
        bgHeight.value = height;
        if (!isImageBackground.value) {
          transparentBackground.set({
            x,
            y,
            width,
            height,
          });
        }
      },
      dragGuide: (x, y, width, height) => {
        if (x < 0 || y < 0) {
          return false;
        }
        if (
          x + width > MAX_AREA_WIDTH &&
          x + width > backController.frameX + backController.frameWidth
        ) {
          return false;
        }
        if (
          y + height > MAX_AREA_HEIGHT &&
          y + height > backController.frameY + backController.frameHeight
        ) {
          return false;
        }
        // -2 是为了解决容差问题
        if (
          x - 2 > foreController.frameX ||
          y - 2 > foreController.frameY ||
          x + width < foreController.frameX + foreController.frameWidth - 2 ||
          y + height < foreController.frameY + foreController.frameHeight - 2
        ) {
          return false;
        }
        return true;
      },
    });
    // 前景控制器
    foreController = new Controller({
      theme: 'fore',
      originX: foreOffsetX,
      originY: foreOffsetY,
      originWidth: imgWidth,
      originHeight: imgHeight,
      mode: 'origin',
      vision: app,
      maxWidth: MAX_AREA_WIDTH,
      maxHeight: MAX_AREA_HEIGHT,
      originAr: imgWidth / imgHeight,
      onChange: (x, y, width, height) => {
        cacheDataUrl = undefined;
        cacheMaskDataUrl = undefined;
        foregroundImage.set({
          x,
          y,
          width,
          height,
        });
      },
      dragGuide: (x, y, width, height) => {
        // -2 是为了解决容差问题
        if (
          x < backController.frameX - 2 ||
          y < backController.frameY - 2 ||
          x + width - 2 > backController.frameX + backController.frameWidth ||
          y + height - 2 > backController.frameY + backController.frameHeight ||
          width > MAX_AREA_WIDTH ||
          height > MAX_AREA_HEIGHT ||
          width < MIN_FORE_WIDTH ||
          height < MIN_FORE_HEIGHT
        ) {
          return false;
        }
        return true;
      },
    });
    foreController.set({
      visible: false,
    });

    // 依次将元素加入画布
    app.add(background);
    app.add(transparentBackground);
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
      scale.value = app.scaleX;
    });
    onScale?.(app.scaleX);
    scale.value = app.scaleX;
    bgWidth.value = backController.frameWidth;
    bgHeight.value = backController.frameHeight;
  }

  function destroy() {
    app?.destroy();
    app = undefined;
    cacheDataUrl = undefined;
    cacheMaskDataUrl = undefined;
    controlMode.value = 'free';
    controlRatio.value = 1;
    isImageBackground.value = false;
  }

  function setBackControlMode(mode: IControllerMode, ratio?: number) {
    controlMode.value = mode;
    controlRatio.value = ratio || controlRatio.value;
    backController.setControllerMode(controlMode.value, controlRatio.value);
    setBgWidth(backController.frameWidth);
  }

  async function gainImage(): Promise<{ imageUrl: string; maskUrl: string }> {
    if (cacheDataUrl && cacheMaskDataUrl) {
      return { imageUrl: cacheDataUrl, maskUrl: cacheMaskDataUrl };
    }
    const { frameX, frameY, frameWidth, frameHeight } = backController;

    const canvas = document.createElement('canvas');
    canvas.width = frameWidth;
    canvas.height = frameHeight;
    const ctx = canvas.getContext('2d')!;

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
    const imageData = ctx.getImageData(0, 0, frameWidth, frameHeight);
    const newImageData = new ImageData(frameWidth, frameHeight);
    for (let i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i + 3] === 0) {
        newImageData.data[i] = 255;
        newImageData.data[i + 1] = 255;
        newImageData.data[i + 2] = 255;
        newImageData.data[i + 3] = 255;
      } else {
        newImageData.data[i] = 0;
        newImageData.data[i + 1] = 0;
        newImageData.data[i + 2] = 0;
        newImageData.data[i + 3] = 255;
      }
    }
    ctx.putImageData(newImageData, 0, 0);
    const maskDataURL = canvas.toDataURL('image/png', 1);
    cacheDataUrl = dataURL;
    cacheMaskDataUrl = maskDataURL;
    return { imageUrl: cacheDataUrl, maskUrl: cacheMaskDataUrl };
  }

  function scaleChange(s: number) {
    if (s < 0.1) {
      return;
    }
    app.set({
      scaleX: s,
      scaleY: s,
    });
    scale.value = s;
  }

  function setPointerEvent(pointerEvents: string) {
    (<HTMLCanvasElement>app.view).style['pointer-events'] = pointerEvents;
  }

  function setBgWidth(w: number) {
    let _width = withinRange(Number(w), [foregroundImage.width, MAX_AREA_WIDTH]);
    let _height;
    if (controlMode.value === 'ratio') {
      _height = _width / backController.controllerRatio;
      // if (!isWithinRange(_height, [foregroundImage.height, MAX_AREA_HEIGHT])) {
      //   _height = withinRange(_height, [foregroundImage.height, MAX_AREA_HEIGHT]);
      //   _width = _height * backController.controllerRatio;
      // }
      if (_width > MAX_AREA_WIDTH || _height > MAX_AREA_HEIGHT) {
        // 固定比例可能会存在背景超出的情况，需要求出最大尺寸，并反向更新前景图尺寸
        if (backController.controllerRatio > 1) {
          _width = MAX_AREA_WIDTH;
          _height = _width / backController.controllerRatio;
        } else {
          _height = MAX_AREA_HEIGHT;
          _width = _height * backController.controllerRatio;
        }
      }
      if (foreController.originAr > backController.controllerRatio) {
        // 需要等宽
        foreController.setFrameWidth(_width);
      } else {
        // 需要等高
        foreController.setFrameHeight(_height);
      }
    }
    if (controlMode.value === 'origin') {
      _height = _width / backController.originAr;
      if (!isWithinRange(_height, [foregroundImage.height, MAX_AREA_HEIGHT])) {
        _height = withinRange(_height, [foregroundImage.height, MAX_AREA_HEIGHT]);
        _width = _height * backController.originAr;
      }
    }
    if (controlMode.value === 'free') {
      _height = backController.frameHeight;
    }

    // 得到合适的背景图大小，对 X / Y 位置进行更新
    if (backController.frameX + _width < foregroundImage.x + foregroundImage.width) {
      foreController.frameX = backController.frameX - foregroundImage.width + _width;
    }
    if (backController.frameX + _width > MAX_AREA_WIDTH) {
      backController.frameX = MAX_AREA_WIDTH - _width;
    }
    if (backController.frameY + _height < foregroundImage.y + foregroundImage.height) {
      foreController.frameY = backController.frameY - foregroundImage.height + _height;
    }
    if (backController.frameY + _height > MAX_AREA_HEIGHT) {
      backController.frameY = MAX_AREA_HEIGHT - _height;
    }
    // 居中处理
    if (_width < MAX_AREA_WIDTH) {
      const offsetX = Math.ceil((MAX_AREA_WIDTH - _width) / 2);
      const moveX = backController.frameX - offsetX;
      backController.frameX = offsetX;
      foreController.frameX = foreController.frameX - moveX;
    }
    if (_height < MAX_AREA_HEIGHT) {
      const offsetY = Math.ceil((MAX_AREA_HEIGHT - _height) / 2);
      const moveY = backController.frameY - offsetY;
      backController.frameY = offsetY;
      foreController.frameY = foreController.frameY - moveY;
    }
    if (foregroundImage.width < _width) {
      const offsetX = Math.ceil((_width - foregroundImage.width) / 2);
      foreController.frameX = backController.frameX + offsetX;
    }
    if (foregroundImage.height < _height) {
      const offsetY = Math.ceil((_height - foregroundImage.height) / 2);
      foreController.frameY = backController.frameY + offsetY;
    }

    foreController.draw();
    backController.setFrameWidth(_width);
  }

  function setBgHeight(h: number) {
    let _width;
    let _height = withinRange(Number(h), [foregroundImage.height, MAX_AREA_HEIGHT]);
    if (controlMode.value === 'ratio') {
      _width = _height * backController.controllerRatio;
      // if (!isWithinRange(_width, [foregroundImage.width, MAX_AREA_WIDTH])) {
      //   _width = withinRange(_width, [foregroundImage.width, MAX_AREA_WIDTH]);
      //   _height = _width / backController.controllerRatio;
      // }
      if (_width > MAX_AREA_WIDTH || _height > MAX_AREA_HEIGHT) {
        // 固定比例可能会存在背景超出的情况，需要求出最大尺寸，并反向更新前景图尺寸
        if (backController.controllerRatio > 1) {
          _width = MAX_AREA_WIDTH;
          _height = _width / backController.controllerRatio;
        } else {
          _height = MAX_AREA_HEIGHT;
          _width = _height * backController.controllerRatio;
        }
      }
      if (foreController.originAr > backController.controllerRatio) {
        // 需要等宽
        foreController.setFrameWidth(_width);
      } else {
        // 需要等高
        foreController.setFrameHeight(_height);
      }
    }
    if (controlMode.value === 'origin') {
      _width = _height * backController.originAr;
      if (!isWithinRange(_width, [foregroundImage.width, MAX_AREA_WIDTH])) {
        _width = withinRange(_width, [foregroundImage.width, MAX_AREA_WIDTH]);
        _height = _width / backController.originAr;
      }
    }
    if (controlMode.value === 'free') {
      _width = backController.frameWidth;
    }

    // 得到合适的背景图大小，对 X / Y 位置进行更新
    if (backController.frameX + _width < foregroundImage.x + foregroundImage.width) {
      foreController.frameX = backController.frameX - foregroundImage.width + _width;
    }
    if (backController.frameX + _width > MAX_AREA_WIDTH) {
      backController.frameX = MAX_AREA_WIDTH - _width;
    }
    if (backController.frameY + _height < foregroundImage.y + foregroundImage.height) {
      foreController.frameY = backController.frameY - foregroundImage.height + _height;
    }
    if (backController.frameY + _height > MAX_AREA_HEIGHT) {
      backController.frameY = MAX_AREA_HEIGHT - _height;
    }

    // 居中处理
    if (_width < MAX_AREA_WIDTH) {
      const offsetX = Math.ceil((MAX_AREA_WIDTH - _width) / 2);
      const moveX = backController.frameX - offsetX;
      backController.frameX = offsetX;
      foreController.frameX = foreController.frameX - moveX;
    }
    if (_height < MAX_AREA_HEIGHT) {
      const offsetY = Math.ceil((MAX_AREA_HEIGHT - _height) / 2);
      const moveY = backController.frameY - offsetY;
      backController.frameY = offsetY;
      foreController.frameY = foreController.frameY - moveY;
    }
    if (foregroundImage.width < _width) {
      const offsetX = Math.ceil((_width - foregroundImage.width) / 2);
      foreController.frameX = backController.frameX + offsetX;
    }
    if (foregroundImage.height < _height) {
      const offsetY = Math.ceil((_height - foregroundImage.height) / 2);
      foreController.frameY = backController.frameY + offsetY;
    }

    foreController.draw();
    backController.setFrameHeight(_height);
  }

  function setForePosition({ x, y, width, height }) {
    foreController.frameX = x;
    foreController.frameY = y;
    foreController.setFrameWidth(width);
    foreController.setFrameHeight(height);
  }

  function setBackPosition({ x, y, width, height }) {
    backController.frameX = x;
    backController.frameY = y;
    backController.setFrameWidth(width);
    backController.setFrameHeight(height);
  }

  function getControlsPosition() {
    return {
      fore: {
        x: foreController.frameX,
        y: foreController.frameY,
        width: foreController.frameWidth,
        height: foreController.frameHeight,
      },
      back: {
        x: backController.frameX,
        y: backController.frameY,
        width: backController.frameWidth,
        height: backController.frameHeight,
      },
    };
  }

  return {
    init,
    destroy,
    gainImage,
    setBackControlMode,
    controlMode,
    controlRatio,
    scale,
    scaleChange,
    setPointerEvent,
    bgWidth,
    bgHeight,
    setBgWidth,
    setBgHeight,
    setForePosition,
    setBackPosition,
    getControlsPosition,
  };
};

// 基于给定范围求值
function withinRange(num, [min, max]) {
  return Number(Math.max(min, Math.min(num, max)));
}
// 是否在给定范围内
function isWithinRange(num, [min, max]) {
  return num >= min && num <= max;
}

function getWHbyAr(ar, wrapDom) {
  let width = 1000;
  let height = 600;
  const wrapperWidth = wrapDom.offsetWidth;
  const wrapperHeight = wrapDom.offsetHeight;

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
