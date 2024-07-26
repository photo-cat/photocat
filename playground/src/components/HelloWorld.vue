<template>
  <div :class="$style.Main" ref="el"></div>
  <br />
  <div>
    <button @click="matting.undo">undo</button>
    <button @click="matting.redo">redo</button>
    <button @click="mount">mount</button>
    <button @click="matting.destroy">destroy</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Matting } from "photocat";

const el = ref<HTMLElement>();
const matting = new Matting();

function mount() {
  matting.mount(el.value!, {
    editingImgUrl:
      "https://aiad-prod.oss-cn-heyuan.aliyuncs.com/1/17cb4ace4ed944bf94d6ac7ec12db6a5.png",
    mattingImgUrl:
      "https://aiad-prod.oss-cn-heyuan.aliyuncs.com/1/1159190783204524033/5770876801768226818/20240724152300691341.png",
  });
}

onMounted(mount);
</script>

<style module>
.Main {
  width: 1000px;
  height: 600px;
}
</style>
