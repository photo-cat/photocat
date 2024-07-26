import {
  Leafer,
  Group,
  Image,
  Rect,
  Canvas,
  PointerEvent,
  MoveEvent,
  ZoomEvent,
  Box,
  RenderEvent,
} from "leafer-ui";
import { getImageWH, getWHbyAr } from "../../utils/img";
import { cloneDeep } from "lodash-es";
import transparentUrl from "../../../assets/transparent-back.png";
import tipUrl from "../../../assets/tip.svg";

import { ReplaceBackground } from "../ReplaceBackground/index";

import { distanceBetween2Points, angleBetween2Points } from "../../utils/point";

const tip = new window.Image();
tip.crossOrigin = "Anonymous";
tip.src = tipUrl;

type IBrushType = "pencil" | "eraser";
interface IBgReplaceStep {
  imgOffset: { x: number; y: number };
  bgInfo: {
    width: number;
    height: number;
    fill;
  };
  scale: number;
  imageData: ImageData;
}

export class Matting {
  constructor() {}

  el: HTMLElement;
  operationEL: HTMLElement;
  previewEL: HTMLElement;

  editingImgFileUrl: string;
  // 对经过保存的图片进行缓存
  cacheOSSFileUrl: string | undefined;

  scale = 1;
  scaleChange(s) {
    if (s < 0.1) {
      return;
    }
    this.scale = s;
  }

  replaceBackground: ReplaceBackground;

  //#region 历史记录
  // 历史记录
  private historyStark: Array<ImageData | IBgReplaceStep> = [];
  // 栈针
  private starkIndex = 0;
  // 往记录栈中添加历史记录
  private pushStep(imageData: ImageData) {
    this.historyStark.splice(this.starkIndex + 1);
    this.historyStark.push(imageData);
    this.starkIndex = this.historyStark.length - 1;
    this.cacheOSSFileUrl = undefined;
  }
  // 往记录栈中添加背景替换历史
  private pushBgStep(step: IBgReplaceStep) {
    this.historyStark.splice(this.starkIndex + 1);
    this.historyStark.push(step);
    this.starkIndex = this.historyStark.length - 1;
    this.cacheOSSFileUrl = undefined;
  }
  // 历史记录专用的 canvas
  // 直接读取画布数据进行存储易造成卡顿
  private historyCanvas = document.createElement("canvas");
  private hisCtx = this.historyCanvas.getContext("2d", {
    willReadFrequently: true,
  })!;
  private pushByCanvas(c: Canvas, imgWidth, imgHeight) {
    this.historyCanvas.width = imgWidth;
    this.historyCanvas.height = imgHeight;
    this.hisCtx?.drawImage(c.context.canvas, 0, 0);
    this.pushStep(this.hisCtx.getImageData(0, 0, imgWidth, imgHeight));
  }

  get undoAble() {
    return this.starkIndex === 0;
  }
  get redoAble() {
    return this.starkIndex === this.historyStark.length - 1;
  }

  undo() {
    if (this.starkIndex >= 0) {
      this.starkIndex--;

      if (this.historyStark[this.starkIndex] instanceof ImageData) {
        this.handleSetMatting(this.historyStark[this.starkIndex] as ImageData);
      } else {
        const { imgOffset, bgInfo, imageData, scale } = this.historyStark[
          this.starkIndex
        ] as IBgReplaceStep;
        this.___layoutByBackground(imgOffset, bgInfo, scale);
        this.handleSetMatting(imageData);
      }
      this.cacheOSSFileUrl = undefined;
    }
  }

  redo() {
    if (this.starkIndex < this.historyStark.length - 1) {
      this.starkIndex++;

      if (this.historyStark[this.starkIndex] instanceof ImageData) {
        this.handleSetMatting(this.historyStark[this.starkIndex] as ImageData);
      } else {
        const { imgOffset, bgInfo, imageData, scale } = this.historyStark[
          this.starkIndex
        ] as IBgReplaceStep;
        this.___layoutByBackground(imgOffset, bgInfo, scale);
        this.handleSetMatting(imageData);
      }
      this.cacheOSSFileUrl = undefined;
    }
  }
  //#endregion

  // 操作画布
  OperationCanvas: Leafer;
  // 预览画布
  PreviewCanvas: Leafer;

  private ___layoutByBackground(
    imgOffset: { x: number; y: number },
    bgInfo,
    scale: number
  ) {
    const transparentBgBox = this.PreviewCanvas.children[0];
    const bgBox = this.PreviewCanvas.children[1];
    transparentBgBox.set({
      width: bgInfo.width,
      height: bgInfo.height,
    });
    bgBox.set(bgInfo);
    const group = bgBox.children[0];
    group.set(imgOffset);

    this.OperationCanvas.children.forEach((c) => c.set(imgOffset));

    this.PreviewCanvas.set({
      x: -imgOffset.x * this.PreviewCanvas.scaleX,
      y: -imgOffset.y * this.PreviewCanvas.scaleY,
    });
    this.OperationCanvas.set({
      x: -imgOffset.x * this.PreviewCanvas.scaleX,
      y: -imgOffset.y * this.PreviewCanvas.scaleY,
    });
  }

  layoutByBackground(imgOffset: { x: number; y: number }, bgInfo, scale) {
    const bgBox = this.PreviewCanvas.children[1];
    this.pushBgStep({
      imgOffset: cloneDeep({
        x: bgBox.x || 0,
        y: bgBox.y || 0,
      }),
      bgInfo: cloneDeep({
        width: bgBox.width!,
        height: bgBox.height!,
        fill: bgBox.fill,
      }),
      scale,
      imageData: this.historyStark.findLast(
        (v) => v instanceof ImageData
      ) as ImageData,
    });

    this.___layoutByBackground(imgOffset, bgInfo, scale);

    // 添加历史记录
    this.pushBgStep({
      imgOffset: cloneDeep(imgOffset),
      bgInfo: cloneDeep(bgInfo),
      scale,
      imageData: this.historyStark.findLast(
        (v) => v instanceof ImageData
      ) as ImageData,
    });
  }

  //#region 笔刷相关
  // 是否正在绘制
  isDrawing = false;
  lastPoint: { x: number; y: number };
  // 笔刷宽度
  brushWidth = 10;
  // 笔刷硬度
  brushHardness = 50;
  // 笔刷类型（画笔/橡皮擦）
  brushType: IBrushType = "pencil";
  setBrushType(type: IBrushType) {
    this.brushType = type;
    this.setCursorStyle();
  }
  setBrushWidth(w) {
    this.brushWidth = w;
    this.setCursorStyle();
  }
  setBrushHardness(h) {
    this.brushHardness = h;
    this.setCursorStyle();
  }
  //#endregion

  // 设置matting 图像
  handleSetMatting: (imageData: ImageData) => void = (_: ImageData) => {};

  async mount(
    el: HTMLElement,
    {
      editingImgUrl,
      mattingImgUrl,
    }: {
      editingImgUrl: string;
      mattingImgUrl: string;
    }
  ) {
    this.el = el;
    el.style.position = "relative";
    el.style.display = "flex";
    el.style.flexDirection = "row";
    el.style.justifyContent = "center";
    el.style.alignItems = "center";
    el.style.gap = "20px";

    this.operationEL = document.createElement("div");
    this.previewEL = document.createElement("div");

    el.appendChild(this.operationEL);
    el.appendChild(this.previewEL);

    this.brushWidth = 10;
    this.brushHardness = 50;
    this.brushType = "pencil";

    const { offsetWidth, offsetHeight } = el!;
    const {
      width: imgWidth,
      height: imgHeight,
      img: maskImgElement,
    } = await getImageWH(mattingImgUrl);
    this.editingImgFileUrl = editingImgUrl;
    const canvasWidth = (offsetWidth - 20) / 2;
    const canvasHeight = offsetHeight;

    //#region 布局
    const ar = imgWidth / imgHeight;
    const imgDomWH = getWHbyAr(ar, canvasWidth, canvasHeight);

    const moveX = (canvasWidth - imgDomWH.width) / 2;
    const moveY = (canvasHeight - imgDomWH.height) / 2;
    this.scaleChange(imgDomWH.width / imgWidth);
    //#endregion

    this.OperationCanvas = new Leafer({
      view: this.operationEL,
      width: canvasWidth,
      height: canvasHeight,
      usePartRender: false,
    });
    this.OperationCanvas.set({
      x: moveX,
      y: moveY,
      scaleX: this.scale,
      scaleY: this.scale,
    });
    this.OperationCanvas.config.cursor = false;

    // 加入透明背景
    this.OperationCanvas.add(
      new Rect({
        x: 0,
        y: 0,
        fill: {
          type: "image",
          mode: "repeat",
          url: transparentUrl,
        },
        width: imgWidth - 1,
        height: imgHeight - 1,
      })
    );

    this.PreviewCanvas = new Leafer({
      view: this.previewEL,
      width: canvasWidth,
      height: canvasHeight,
      usePartRender: false,
    });
    this.PreviewCanvas.set({
      x: moveX,
      y: moveY,
      scaleX: this.scale,
      scaleY: this.scale,
    });
    // 加入背景,默认为透明
    const _transparentBg = new Box({
      x: 0,
      y: 0,
      fill: {
        type: "image",
        mode: "repeat",
        url: transparentUrl,
      },
      width: imgWidth - 1,
      height: imgHeight - 1,
      overflow: "hide",
    });
    const _pvBg = new Box({
      x: 0,
      y: 0,
      fill: "transparent",
      width: imgWidth,
      height: imgHeight,
      overflow: "hide",
    });
    this.PreviewCanvas.add(_transparentBg);
    this.PreviewCanvas.add(_pvBg);

    this.OperationCanvas.config.zoom = {
      max: 5,
      min: 0.25,
    };
    this.PreviewCanvas.config.zoom = {
      max: 5,
      min: 0.25,
    };

    //#region 初始化操作画布内元素
    // 被抠图图像
    const _opImg = new Image({
      x: 0,
      y: 0,
      url: this.editingImgFileUrl,
      width: imgWidth,
      height: imgHeight,
    });

    const _opMask = new Group({
      x: 0,
      y: 0,
    });
    const _colorRect = new Rect({
      x: 0,
      y: 0,
      width: imgWidth,
      height: imgHeight,
      fill: `red`,
      opacity: 180 / 255,
    });
    const _opMaskCanvas = new Canvas({
      x: 0,
      y: 0,
      width: imgWidth,
      height: imgHeight,
      scaleX: this.OperationCanvas.pixelRatio,
      scaleY: this.OperationCanvas.pixelRatio,
      pixelRatio: this.OperationCanvas.pixelRatio,
      mask: true,
    });
    _opMaskCanvas.context.drawImage(maskImgElement, 0, 0);
    _opMask.addAt(_opMaskCanvas, 0);
    _opMask.add(_colorRect);

    this.OperationCanvas.add(_opImg);
    this.OperationCanvas.add(_opMask);
    //#endregion

    //#region 初始化预览画布内元素
    // 被抠图图像
    const _pvImgGroup = new Group({
      x: 0,
      y: 0,
    });
    const _pvImg = new Image({
      x: 0,
      y: 0,
      url: this.editingImgFileUrl,
      width: imgWidth,
      height: imgHeight,
    });
    const _pvMaskCanvas = new Canvas({
      x: 0,
      y: 0,
      width: imgWidth,
      height: imgHeight,
      scaleX: this.PreviewCanvas.pixelRatio,
      scaleY: this.PreviewCanvas.pixelRatio,
      pixelRatio: this.PreviewCanvas.pixelRatio,
      mask: true,
    });
    _pvMaskCanvas.context.drawImage(maskImgElement, 0, 0);

    _pvImgGroup.addAt(_pvMaskCanvas, 0);
    _pvImgGroup.add(_pvImg);

    _pvBg.add(_pvImgGroup);
    //#endregion

    // 初始化光标
    this.setCursorStyle();
    // 初始化设置matting图像方法
    this.handleSetMatting = (imageData: ImageData) => {
      _opMaskCanvas.context.clearRect(0, 0, imgWidth, imgHeight);
      _pvMaskCanvas.context.clearRect(0, 0, imgWidth, imgHeight);
      _opMaskCanvas.context.putImageData(imageData, 0, 0);
      _pvMaskCanvas.context.putImageData(imageData, 0, 0);
      _opMaskCanvas.paint();
      _pvMaskCanvas.paint();
    };
    // 增加第一条历史记录
    this.pushStep(
      _pvMaskCanvas.context.getImageData(0, 0, imgWidth, imgHeight)
    );

    //#region 操作画布事件
    this.OperationCanvas.on(PointerEvent.DOWN, (e) => {
      if (!e.left) return;
      this.isDrawing = true;
      this.lastPoint = {
        x: e.x,
        y: e.y,
      };
      _opMaskCanvas.worldToLocal(this.lastPoint);
    });
    this.OperationCanvas.on(PointerEvent.MOVE, (e) => {
      if (!this.isDrawing) {
        return;
      }
      const startPoint = cloneDeep(this.lastPoint);
      this.lastPoint = {
        x: e.x,
        y: e.y,
      };
      _opMaskCanvas.worldToLocal(this.lastPoint);

      const distance = parseInt(
        distanceBetween2Points(startPoint, this.lastPoint) + ""
      );
      const angle = angleBetween2Points(startPoint, this.lastPoint);

      let x, y;
      const halfBrushW = this.brushWidth / 2;
      _opMaskCanvas.context.save();
      _pvMaskCanvas.context.save();

      if (this.brushHardness !== 100) {
        const blurLength = getBlurLength(this.brushHardness);

        const buffWidth = halfBrushW + Math.round(blurLength) + 1;
        const rectWidth =
          Math.abs(this.lastPoint.x - startPoint.x) + buffWidth * 2;
        const rectHeight =
          Math.abs(this.lastPoint.y - startPoint.y) + buffWidth * 2;
        // 创建裁剪路径
        _opMaskCanvas.context.beginPath();
        _opMaskCanvas.context.rect(
          Math.min(startPoint.x, this.lastPoint.x) - buffWidth,
          Math.min(startPoint.y, this.lastPoint.y) - buffWidth,
          rectWidth,
          rectHeight
        );
        _opMaskCanvas.context.closePath();
        _pvMaskCanvas.context.beginPath();
        _pvMaskCanvas.context.rect(
          Math.min(startPoint.x, this.lastPoint.x) - buffWidth,
          Math.min(startPoint.y, this.lastPoint.y) - buffWidth,
          rectWidth,
          rectHeight
        );
        _pvMaskCanvas.context.closePath();

        // 将路径应用为裁剪区域
        _opMaskCanvas.context.clip();
        _pvMaskCanvas.context.clip();

        _opMaskCanvas.context.filter = `blur(${blurLength}px)`;
        _pvMaskCanvas.context.filter = `blur(${blurLength}px)`;
      }
      if (this.brushType === "eraser") {
        _opMaskCanvas.context.globalCompositeOperation = "destination-out";
        _pvMaskCanvas.context.globalCompositeOperation = "destination-out";
      }

      for (let z = 0; z <= distance || z == 0; z++) {
        x = startPoint.x + Math.sin(angle) * z - halfBrushW;
        y = startPoint.y + Math.cos(angle) * z - halfBrushW;
        _opMaskCanvas.context.drawImage(
          tip,
          x,
          y,
          this.brushWidth,
          this.brushWidth
        );
        _pvMaskCanvas.context.drawImage(
          tip,
          x,
          y,
          this.brushWidth,
          this.brushWidth
        );
      }
      _opMaskCanvas.context.restore();
      _pvMaskCanvas.context.restore();
      _opMaskCanvas.paint();
      _pvMaskCanvas.paint();
    });
    this.OperationCanvas.on(PointerEvent.UP, (e) => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      this.lastPoint = {
        x: e.x,
        y: e.y,
      };
      _opMaskCanvas.worldToLocal(this.lastPoint);
      _opMaskCanvas.context.save();
      _pvMaskCanvas.context.save();
      if (this.brushHardness !== 100) {
        const blurLength = getBlurLength(this.brushHardness);
        _opMaskCanvas.context.filter = `blur(${blurLength}px)`;
        _pvMaskCanvas.context.filter = `blur(${blurLength}px)`;
      }
      if (this.brushType === "eraser") {
        _opMaskCanvas.context.globalCompositeOperation = "destination-out";
        _pvMaskCanvas.context.globalCompositeOperation = "destination-out";
      }

      const x = this.lastPoint.x - this.brushWidth / 2;
      const y = this.lastPoint.y - this.brushWidth / 2;
      _opMaskCanvas.context.drawImage(
        tip,
        x,
        y,
        this.brushWidth,
        this.brushWidth
      );
      _pvMaskCanvas.context.drawImage(
        tip,
        x,
        y,
        this.brushWidth,
        this.brushWidth
      );

      _opMaskCanvas.context.restore();
      _pvMaskCanvas.context.restore();
      _opMaskCanvas.paint();
      _pvMaskCanvas.paint();

      this.pushByCanvas(_pvMaskCanvas, imgWidth, imgHeight);
    });

    // 移动缩放画布
    this.OperationCanvas.on(MoveEvent.MOVE, () => {
      this.PreviewCanvas.set({
        x: this.OperationCanvas.x,
        y: this.OperationCanvas.y,
        scaleX: this.OperationCanvas.scaleX,
        scaleY: this.OperationCanvas.scaleY,
      });
    });
    this.OperationCanvas.on(ZoomEvent.ZOOM, () => {
      this.PreviewCanvas.set({
        x: this.OperationCanvas.x,
        y: this.OperationCanvas.y,
        scaleX: this.OperationCanvas.scaleX,
        scaleY: this.OperationCanvas.scaleY,
      });
      this.setCursorStyle();
      this.scaleChange(this.OperationCanvas.scaleX);
    });
    //#endregion

    //#region 预览画布事件
    this.PreviewCanvas.on(MoveEvent.MOVE, () => {
      this.OperationCanvas.set({
        x: this.PreviewCanvas.x,
        y: this.PreviewCanvas.y,
        scaleX: this.PreviewCanvas.scaleX,
        scaleY: this.PreviewCanvas.scaleY,
      });
    });
    this.PreviewCanvas.on(ZoomEvent.ZOOM, () => {
      this.OperationCanvas.set({
        x: this.PreviewCanvas.x,
        y: this.PreviewCanvas.y,
        scaleX: this.PreviewCanvas.scaleX,
        scaleY: this.PreviewCanvas.scaleY,
      });
      this.setCursorStyle();
      this.scaleChange(this.OperationCanvas.scaleX);
    });
    //#endregion
  }

  destroy() {
    this.OperationCanvas.destroy();
    this.PreviewCanvas.destroy();
    // @ts-ignore
    this.OperationCanvas = null;
    // @ts-ignore
    this.PreviewCanvas = null;
    this.historyStark = [];
  }

  // 设置光标样式
  setCursorStyle() {
    this.operationEL.style.cursor = getCursorStyle(
      this.brushWidth,
      this.OperationCanvas.scaleX,
      this.brushType,
      this.brushHardness
    );
  }
}

// 设置绘制光标
function getCursorStyle(width, scale, type: IBrushType, hardness) {
  const blurLength = getBlurLength(hardness);
  const size = Math.max((width + blurLength * 2) * scale, 2);
  const circle = `
    <svg
        width="128"
        height="128"
        fill="black"
        viewBox="0 0 256 266"
        xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="${size}px"
        cy="${size}px"
        r="${size}"
        opacity="1"
        fill="none"
        stroke-width="2"
        stroke="white"
      />
      <circle
        cx="${size}px"
        cy="${size}px"
        r="${size - 1}"
        opacity="1"
        fill="none"
        stroke-width="2"
        stroke="black"
      />
      ${
        type === "pencil"
          ? `
        <svg x="${size * 2}" y="${size * 2}" fill="black">
          <path d="M28.8,3.9c-0.7-0.7-1.7-0.7-2.4-0.1L12.6,15.6l4.7,4.7L29.1,6.5C29.5,5.7,29.5,4.6,28.8,3.9z"/>
          <path d="M2.7,28.2c2.3,0.5,8.2,1,10.6-2.7s-0.2-6.3-1.5-6.8c-1.2-0.5-4.2-0.9-6.1,1.5c-0.8,1.1-0.9,1.9-1.1,3
            c-0.1,0.7-0.2,1.4-0.5,2.3s-0.8,1.6-1.2,2.1C2.9,27.8,2.8,28,2.7,28.2z"/>
          <path fill-rule="evenodd" clip-rule="evenodd" fill="#FFFFFF"  d="M10.6,15.5c0-0.6,0.3-1.1,0.7-1.4L25.1,2.3c1.5-1.2,3.8-1.2,5.1,0.2c1.4,1.4,1.5,3.6,0.2,5.1L18.6,21.4
            c-0.3,0.4-0.9,0.7-1.4,0.7c-0.3,0-0.7-0.1-1-0.2c0.2,1.4-0.2,3-1.3,4.7c-1.7,2.5-4.4,3.4-6.8,3.8c-2.3,0.3-4.7,0.1-5.9-0.2
            c-0.6-0.2-1.1-0.6-1.3-1.1c-0.2-0.6-0.2-1.2,0-1.8c0.2-0.3,0.4-0.6,0.5-0.8c0,0,0-0.1,0.1-0.1c0.3-0.5,0.7-0.9,0.8-1.6
            c0.2-0.7,0.3-1.2,0.4-1.9v-0.1c0.2-1.1,0.3-2.4,1.4-3.9c1.3-1.8,3.1-2.4,4.6-2.7c0.7-0.1,1.4-0.1,2,0C10.6,16.1,10.5,15.8,10.6,15.5
            z M3.9,26.4c-0.2,0.5-0.6,0.9-0.8,1.2c-0.2,0.2-0.3,0.4-0.4,0.6c0.4,0.1,0.9,0.2,1.6,0.2c0.2,0,0.4,0.1,0.6,0.1
            c2.8,0.2,6.6-0.2,8.4-2.9c2.4-3.7-0.2-6.3-1.5-6.8c-1.2-0.5-4.2-0.9-6.1,1.5c-0.8,1.1-0.9,1.9-1.1,3c-0.1,0.7-0.2,1.4-0.5,2.3
            C4.1,25.8,4,26.1,3.9,26.4z M26.4,3.8c0.7-0.6,1.8-0.6,2.4,0.1s0.7,1.7,0.1,2.4L17.1,20.1l-4.7-4.7L26.4,3.8z"/>
        </svg>`
          : `
        <svg x="${size * 2}" y="${size * 2}" fill="black">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M9,29.7c-0.4,0-0.6-0.2-0.8-0.4l-1.4-1.8l-4.6-4.6c-1-1-1-2.4,0-3.4l17-17l0.2-0.2c0.4-0.4,1-0.6,1.4-0.6
          c0.6,0,1.2,0.2,1.6,0.6L29,8.9c0.4,0.4,0.6,1,0.6,1.6s-0.2,1.2-0.6,1.6L15.8,25.3h13c0.6,0,1,0.4,1,1v1.8c0,0.6-0.4,1-1,1H9V29.7z
          M10.6,25.9l4.8-4.8L11,16.5l-4.8,4.8L10.6,25.9z"/>
          <path fill="#FFFFFF" d="M21,3.1c0.4,0,0.6,0.2,1,0.4l6.6,6.6c0.6,0.6,0.6,1.4,0,1.8l-15,15h15.6v1.8h-20l-1.6-1.8l0,0L3,22.3
            c-0.6-0.6-0.6-1.4,0-1.8l17-17l0,0l0,0C20.4,3.1,20.6,3.1,21,3.1 M10.2,26.9H11l5.8-5.8l-5.8-6l-6.4,6.4L10.2,26.9 M21,1.1L21,1.1
            c-0.8,0-1.6,0.2-2.2,0.8c0,0-0.2,0-0.2,0.2l0,0l-17,17c-1.2,1.2-1.2,3.4,0,4.8l4.6,4.6l0,0l1.4,1.6c0.4,0.4,1,0.8,1.6,0.8h20
            c1.2,0,2-0.8,2-2v-1.8c0-1.2-0.8-2-2-2H18.4l11.4-11.4c1.2-1.2,1.2-3.4,0-4.8l-6.6-6.6C22.6,1.5,21.8,1.1,21,1.1L21,1.1z M7.6,21.5
            l3.4-3.4l3,3l-3.4,3.4L7.6,21.5L7.6,21.5z"/>
        </svg>`
      }
      
      
    </svg>`;
  const cursorData = `data:image/svg+xml;base64,${window.btoa(circle)}`;

  return `url(${cursorData}) ${size / 2} ${size / 2}, crosshair`;
}

function getBlurLength(hardness: number): number {
  return Number((((100 - hardness) / 50) * 1.5).toFixed(2));
}
