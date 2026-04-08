<template>
  <div id="app">
    <el-menu mode="horizontal" :default-active="$route.path" router>
      <el-menu-item index="/voice">语音生成</el-menu-item>
      <el-menu-item index="/image">图片生成</el-menu-item>
      <el-menu-item index="/history">历史记录</el-menu-item>
      <el-menu-item index="/voice/manage">音色管理</el-menu-item>
      <el-menu-item index="/voice/clone">音色复刻</el-menu-item>
    </el-menu>
    <div class="content">
      <router-view />
    </div>
  </div>
</template>

<script setup>
</script>

<style>
#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.content {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
