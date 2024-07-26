import { App, Leafer, Image, Rect } from 'leafer-ui';
import { nextTick, ref } from 'vue';
import { getImageWH, getWHbyAr } from '../../utils/img';
import { getMinCoverRectWH } from '../../utils/ombb';
import { Cropper, ICropMode } from './index';
import { transparentUrl } from '../../constants/index';

const el = 'cropCanvasEl';
let app: App;
let BackCanvas: Leafer;
// 图像画布，关注图像的移动、翻转
let ImgCanvas: Leafer;
// 裁切框画布，关注裁切框的行为
let CropCanvas: Leafer;

// 被裁切的图片
let editImg: Image;
// 背景图
let backImg: Rect;

// 裁切框
let cropper: Cropper;

// 对经过保存的图片进行缓存
let cacheFileUrl: string | undefined;

export const useCropEditor = () => {
  // 角度
  const angle = ref(0);
  function setAngle(a) {
    angle.value = a;
    handleSetAngle(a);
    cacheFileUrl = undefined;
  }
  let handleSetAngle = (_: number) => {};

  // 裁切框模式
  const cropMode = ref<ICropMode>('free');
  // 固定比例大小
  const cropRatio = ref<number>(1);

  function setCropMode(mode: ICropMode, ratio?: number) {
    cropMode.value = mode;
    cropRatio.value = ratio || cropRatio.value;
    cropper.setCropMode(cropMode.value, cropRatio.value);
  }

  async function init(url: string) {
    const editingImgUrl = url;
    const { offsetWidth, offsetHeight } = document.getElementById(el)!;
    const { width: imgWidth, height: imgHeight } = await getImageWH(editingImgUrl);

    app = new App({
      view: el,
      width: offsetWidth,
      height: offsetHeight,
    });

    //#region 布局
    const ar = imgWidth / imgHeight;
    const padding = 40;
    const imgDomWH = getWHbyAr(ar, offsetWidth - padding * 2, offsetHeight - padding * 2);

    const imgDomWidth = imgDomWH.width;
    const imgDomHeight = imgDomWH.height;

    const moveX = (offsetWidth - imgDomWidth) / 2;
    const moveY = (offsetHeight - imgDomHeight) / 2;
    const scale = imgDomWidth / imgWidth;
    //#endregion
    BackCanvas = new Leafer({
      type: 'user',
    });
    BackCanvas.set({
      x: moveX,
      y: moveY,
      scaleX: scale,
      scaleY: scale,
    });

    ImgCanvas = new Leafer({
      type: 'user',
    });
    ImgCanvas.set({
      x: moveX,
      y: moveY,
      scaleX: scale,
      scaleY: scale,
    });
    CropCanvas = new Leafer({
      type: 'user',
    });
    CropCanvas.set({
      x: moveX,
      y: moveY,
      scaleX: scale,
      scaleY: scale,
    });

    app.add(BackCanvas);
    app.add(ImgCanvas);
    app.add(CropCanvas);

    // 被裁切的图片
    backImg = new Rect({
      x: imgWidth / 2,
      y: imgHeight / 2,
      width: imgWidth,
      height: imgHeight,
      around: 'center',
      fill: {
        type: 'image',
        mode: 'repeat',
        url: transparentUrl,
      },
    });
    BackCanvas.add(backImg);
    editImg = new Image({
      x: imgWidth / 2,
      y: imgHeight / 2,
      url: editingImgUrl,
      width: imgWidth,
      height: imgHeight,
      around: 'center',
    });
    ImgCanvas.add(editImg);

    // 裁切框
    cropper = new Cropper({
      restrictedArea: [0, 0, imgWidth, imgHeight],
      vision: CropCanvas,
      originAr: ar,
      onChange: () => {
        cacheFileUrl = undefined;
      },
    });
    CropCanvas.add(cropper);

    //#region 旋转事件
    handleSetAngle = (ag: number) => {
      const { width, height } = getMinCoverRectWH(
        {
          x: imgWidth / 2,
          y: imgHeight / 2,
        },
        imgWidth / imgHeight,
        cropper.getVertexCoordinates(),
        ag,
      );
      editImg.set({
        rotation: ag,
        around: 'center',
        width,
        height,
      });
      backImg.set({
        width: cropper.frameWidth,
        height: cropper.frameHeight,
      });
    };
    //#endregion

    setTimeout(() => {
      // 一开始没有做任何编辑，因此将原图 cache
      cacheFileUrl = url;
    }, 0);
  }

  function destory() {
    ImgCanvas?.destroy();
    CropCanvas?.destroy();
    app?.destroy();
    // @ts-ignore
    ImgCanvas = undefined;
    // @ts-ignore
    CropCanvas = undefined;
    // @ts-ignore
    app = undefined;
  }

  // 正在生成图片
  const generating = ref(false);

  // 获取当前裁剪后的图像
  async function gainCroppedImg(): Promise<string> {
    if (cacheFileUrl) {
      return cacheFileUrl;
    }
    generating.value = true;
    const canvas = document.createElement('canvas');
    canvas.width = ImgCanvas.canvas.view.width;
    canvas.height = ImgCanvas.canvas.view.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      ImgCanvas.canvas.view,
      0,
      0,
      ImgCanvas.canvas.view.width,
      ImgCanvas.canvas.view.height,
    );

    const { frameX, frameY, frameWidth, frameHeight } = cropper;

    const offsetCanvasX =
      (ImgCanvas.canvas.view.width -
        cropper.restrictedWidth * CropCanvas.pixelRatio * CropCanvas.scaleX) /
      2;
    const offsetCanvasY =
      (ImgCanvas.canvas.view.height -
        cropper.restrictedHeight * CropCanvas.pixelRatio * CropCanvas.scaleY) /
      2;

    const cropImgWidth = frameWidth * CropCanvas.pixelRatio * CropCanvas.scaleX;
    const cropImgHeight = frameHeight * CropCanvas.pixelRatio * CropCanvas.scaleY;

    const imageData = ctx.getImageData(
      Math.ceil(frameX * CropCanvas.pixelRatio * CropCanvas.scaleX + offsetCanvasX),
      Math.ceil(frameY * CropCanvas.pixelRatio * CropCanvas.scaleX + offsetCanvasY),
      cropImgWidth,
      cropImgHeight,
    );

    const outputCanvas = document.createElement('canvas')!;
    const outCtx = outputCanvas.getContext('2d')!;
    outputCanvas.width = imageData.width;
    outputCanvas.height = imageData.height;
    outCtx.putImageData(imageData, 0, 0);

    const dataURL = outputCanvas.toDataURL();
    cacheFileUrl = dataURL;
    generating.value = false;
    return dataURL;
  }

  // 翻转
  function flip(axis: 'x' | 'y') {
    if (axis === 'x') {
      editImg.set({
        around: 'center',
        scaleX: editImg.scaleX * -1,
      });
    } else if (axis === 'y') {
      editImg.set({
        around: 'center',
        scaleY: editImg.scaleY * -1,
      });
    }
    cacheFileUrl = undefined;
  }

  // 旋转
  async function rotate(deg) {
    const url = await rotateImage(editImg.url, deg * (Math.PI / 180));
    destory();
    await init(url);

    setAngle(angle.value);
    nextTick(() => {
      cacheFileUrl = undefined;
    });
  }

  return {
    el,
    angle,
    setAngle,
    init,
    destory,
    cropMode,
    setCropMode,
    gainCroppedImg,
    flip,
    cropRatio,
    generating,
    rotate,
  };
};

// 获取旋转后的图片
async function rotateImage(url, angle) {
  const { img, width, height } = await getImageWH(url);
  // 创建一个新的 Canvas 元素
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  const rotatedWidth = Math.abs(Math.cos(angle) * width) + Math.abs(Math.sin(angle) * height);
  const rotatedHeight = Math.abs(Math.sin(angle) * width) + Math.abs(Math.cos(angle) * height);

  // 设置 Canvas 的尺寸
  canvas.width = rotatedWidth;
  canvas.height = rotatedHeight;

  // 旋转并绘制图片
  context.translate(rotatedWidth / 2, rotatedHeight / 2);
  context.rotate(angle);
  context.drawImage(img, -width / 2, -height / 2);

  return canvas.toDataURL();
}
