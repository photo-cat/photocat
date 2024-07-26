import { Image, Leafer, PointerEvent, Rect, ZoomEvent } from "leafer-ui";
import { Controller, IControllerMode } from "../../components/Controller";
import { getImageAABB, getImageWH, getWHbyAr } from "../../utils/img";
import transparentUrl from "../../../assets/transparent-back.png";

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

type IBackgroundFill =
  | {
      type: "image";
      url: string;
    }
  | {
      type: "color";
      color: string;
    };

export class ReplaceBackground {
  app: Leafer;
  transparentBackground: Rect;
  background: Rect;
  foregroundImage: Image;
  backController: Controller;
  foreController: Controller;

  cacheOssUrl: string;

  // 控制框模式
  controlMode: IControllerMode = "free";
  // 固定比例大小
  controlRatio: number = 1;

  // 是否为图片背景
  isImageBackground = false;

  // 合成中
  generating = false;

  // 透明图片偏移量
  trimInfo: { x: number; y: number; width: number; height: number } = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };

  async init(
    dom: HTMLElement,
    foregroundImageUrl: string,
    config: {
      onScale?: (scale: number) => void;
      onBgChange?: (x, y, width, height) => void;
      padding?: number;
    } = {}
  ) {
    const { onBgChange, padding, onScale } = config;
    const { offsetWidth, offsetHeight } = dom;
    const {
      width: trimWidth,
      height: trimHeight,
      url,
      offset,
    } = await getImageAABB(foregroundImageUrl);

    this.trimInfo = {
      x: offset.x,
      y: offset.y,
      width: trimWidth,
      height: trimHeight,
    };

    // 原图的尺寸
    const { width: imgWidth, height: imgHeight } = await getImageWH(
      foregroundImageUrl
    );

    this.app = new Leafer({
      view: dom,
      width: offsetWidth,
      height: offsetHeight,
    });

    this.app.config.zoom = {
      min: 0.25,
      max: 5,
    };
    this.app.config.cursor = false;

    //#region 布局
    const ar = imgWidth / imgHeight;
    const _padding = padding || 80;
    const imgDomWH = getWHbyAr(
      ar,
      offsetWidth - _padding * 2,
      offsetHeight - _padding * 2
    );

    const imgDomWidth = imgDomWH.width;
    const imgDomHeight = imgDomWH.height;

    const moveX = (offsetWidth - imgDomWidth) / 2;
    const moveY = (offsetHeight - imgDomHeight) / 2;
    const scale = imgDomWidth / imgWidth;

    this.app.set({
      x: moveX,
      y: moveY,
      scaleX: scale,
      scaleY: scale,
    });
    //#endregion

    // 背景
    this.transparentBackground = new Rect({
      width: imgWidth,
      height: imgHeight,
      fill: {
        type: "image",
        mode: "repeat",
        url: transparentUrl,
      },
    });

    this.background = new Rect({
      width: imgWidth,
      height: imgHeight,
      fill: "transparent",
    });
    // 前景图
    this.foregroundImage = new Image({
      x: offset.x,
      y: offset.y,
      url,
      width: trimWidth,
      height: trimHeight,
      cursor: "move",
      strokeWidth: 2 / scale,
    });
    // 背景控制器
    this.backController = new Controller({
      theme: "back",
      originWidth: imgWidth,
      originHeight: imgHeight,
      vision: this.app,
      originAr: ar,
      maxWidth: 15360,
      maxHeight: 15360,
      onChange: (x, y, width, height) => {
        this.cacheOssUrl = undefined;
        onBgChange?.(x, y, width, height);
        if (!this.isImageBackground) {
          this.transparentBackground.set({
            x,
            y,
            width,
            height,
          });
          this.background.set({
            x,
            y,
            width,
            height,
          });
        }
      },
    });
    // 前景控制器
    this.foreController = new Controller({
      theme: "fore",
      originX: offset.x,
      originY: offset.y,
      originWidth: trimWidth,
      originHeight: trimHeight,
      mode: "origin",
      vision: this.app,
      originAr: trimWidth / trimHeight,
      maxWidth: 15360,
      maxHeight: 15360,
      onChange: (x, y, width, height) => {
        this.cacheOssUrl = undefined;
        this.foregroundImage.set({
          x,
          y,
          width,
          height,
        });
      },
    });
    this.foreController.set({
      visible: false,
    });

    // 依次将元素加入画布
    this.app.add(this.transparentBackground);
    this.app.add(this.background);
    this.app.add(this.foregroundImage);
    this.app.add(this.backController);
    this.app.add(this.foreController);

    this.app.on(PointerEvent.DOWN, (e) => {
      if (!e.left) return;
      if (this.backController.pointerKeys.includes(e.target.name)) {
        return;
      }
      const point = { x: e.x, y: e.y };
      this.foregroundImage.worldToInner(point);
      // 如果用户点击前景图区域，则显示前景图控制器
      const xx = Math.ceil(point.x);
      const yy = Math.ceil(point.y);
      const showForeController =
        xx >= 0 &&
        xx <= this.foregroundImage.width &&
        yy >= 0 &&
        yy <= this.foregroundImage.height;
      this.backController.set({
        visible: !showForeController,
      });
      this.foreController.set({
        visible: showForeController,
      });
    });
    this.app.on(PointerEvent.MOVE, (e) => {
      const point = { x: e.x, y: e.y };
      this.foregroundImage.worldToInner(point);
      // 如果用户点击前景图区域，则显示前景图控制器
      const xx = Math.ceil(point.x);
      const yy = Math.ceil(point.y);
      const showHover =
        xx >= 0 &&
        xx <= this.foregroundImage.width &&
        yy >= 0 &&
        yy <= this.foregroundImage.height;

      this.foregroundImage.set({
        stroke: showHover ? "#00EBA5" : undefined,
      });
    });
    this.app.on(ZoomEvent.ZOOM, () => {
      onScale?.(this.app.scaleX);
    });
    onScale?.(this.app.scaleX);
  }

  destroy() {
    this.app?.destroy();
    this.app = undefined;
    this.cacheOssUrl = undefined;
    this.controlMode = "free";
    this.controlRatio = 1;
    this.isImageBackground = false;
    this.generating = false;
    this.trimInfo = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }

  async setBackGround(fill: IBackgroundFill) {
    this.cacheOssUrl = undefined;
    this.isImageBackground = fill.type === "image";
    if (fill.type === "image") {
      const { x, y, width, height } = await getImagePositionInfo(
        fill.url,
        this.backController
      );
      this.transparentBackground.set({
        x,
        y,
        width,
        height,
      });
      this.background.set({ fill, x, y, width, height });
    } else {
      this.transparentBackground.set({
        x: this.backController.frameX,
        y: this.backController.frameY,
        width: this.backController.frameWidth,
        height: this.backController.frameHeight,
      });
      this.background.set({
        fill: fill.color,
        x: this.backController.frameX,
        y: this.backController.frameY,
        width: this.backController.frameWidth,
        height: this.backController.frameHeight,
      });
    }
  }

  setBackControlMode(mode: IControllerMode, ratio?: number) {
    this.controlMode = mode;
    this.controlRatio = ratio || this.controlRatio;
    this.backController.setControllerMode(this.controlMode, this.controlRatio);
  }

  setBackControlWH(width: number, height: number) {
    this.backController.setFrameWidth(width);
    this.backController.setFrameHeight(height);
  }

  async gainImage(): Promise<string> {
    if (this.cacheOssUrl) {
      return this.cacheOssUrl;
    }
    this.generating = true;
    const { frameX, frameY, frameWidth, frameHeight } = this.backController;

    const canvas = document.createElement("canvas");
    canvas.width = frameWidth;
    canvas.height = frameHeight;
    const ctx = canvas.getContext("2d")!;
    // 绘制背景图
    if (this.background.fill?.type === "image") {
      if (this.background.fill?.url !== transparentUrl) {
        const { img } = await getImageWH(this.background.fill!.url);
        ctx.drawImage(
          img,
          this.background.x - frameX,
          this.background.y - frameY,
          this.background.width,
          this.background.height
        );
      }
    } else {
      ctx.fillStyle = this.background.fill as string;
      ctx.fillRect(0, 0, frameWidth, frameHeight);
    }

    if (this.foregroundImage.url) {
      const { img } = await getImageWH(this.foregroundImage.url);
      // 绘制前景图
      ctx.drawImage(
        img,
        this.foregroundImage.x - frameX,
        this.foregroundImage.y - frameY,
        this.foregroundImage.width,
        this.foregroundImage.height
      );
    }

    const dataURL = canvas.toDataURL("image/png", 1);
    // TODO
    // if (config.uploadOss) {
    //   this.cacheOssUrl = await uploadByDataURL(dataURL);
    //   return this.cacheOssUrl;
    // }
    return dataURL;
  }

  // 获取前景图与后景图尺寸比例以及相位差
  gainInfo() {
    const { x: foreX, y: foreY, width: foreWidth } = this.foregroundImage;
    const {
      frameX: backX,
      frameY: backY,
      frameWidth: backWidth,
      frameHeight: backHeight,
    } = this.backController;
    const { fill } = this.background;
    const { x: trimX, y: trimY, width: trimWidth } = this.trimInfo;
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

  getCacheInfo() {
    return {
      fore: {
        x: this.foregroundImage.x,
        y: this.foregroundImage.y,
        width: this.foregroundImage.width,
        height: this.foregroundImage.height,
      },
      back: {
        x: this.backController.frameX,
        y: this.backController.frameY,
        width: this.backController.frameWidth,
        height: this.backController.frameHeight,
        fill: this.background.fill,
      },
    };
  }

  setBackgroundByInfo(info) {
    const { back, fore } = info;
    this.transparentBackground.set({
      x: back.x,
      y: back.y,
      width: back.width,
      height: back.height,
    });
    this.background.set(back);
    this.backController.setPhase(back.x, back.y, back.width, back.height);
    this.foregroundImage.set(fore);
    this.foreController.setPhase(fore.x, fore.y, fore.width, fore.height);
  }

  scaleTo(scale: number) {
    this.app.set({
      scaleX: scale,
      scaleY: scale,
    });
  }
}
