# Waveshare ESP32-S3-Touch-LCD-1.69

屏幕 240 × 280，板载 ESP32-S3、16 MB Flash、8 MB PSRAM。使用板内已经连接的屏幕和触摸，不需要再接旧的 ESP32 或 1.44 英寸 HAT。

用 Arduino IDE 打开 `Eumo169/Eumo169.ino`（同目录全部文件需要保留）。Espressif ESP32 开发板包 3.3.12，开发板选择 **Waveshare ESP32-S3 Touch LCD 1.69**，PSRAM **Enabled**，USB CDC On Boot **Enabled**；库管理器安装 **ArduinoJson 7.4.2**。LCD 驱动随源码提供。选择实际出现的串口后上传。

已验证的 CLI 编译参数：

```text
arduino-cli compile --fqbn esp32:esp32:waveshare_esp32_s3_touch_lcd_169:CDCOnBoot=cdc,PSRAM=enabled Eumo169
```

已有设备更新必须保持原分区表，不能执行 erase-flash / 全盘格式化。此分区的 FFat 从 `0x610000` 开始，大小 `0x9E0000`；NVS 保存 Wi-Fi 与设备身份。不删除这些数据，结束和暂停也不会清空已有时间、深度或收获。操作硬件前先保存当前会话并备份存档。

屏幕驱动：SPI DC=4 / CS=5 / SCK=6 / MOSI=7 / RST=8 / BL=15，ST7789 240×280、Y 偏移 20。触摸 I²C SDA=11 / SCL=10 / RST=13 / IRQ=14。代码针对此型号，不能直接烧录到旧 ESP32-WROOM 板。

主界面：左下开始 / 暂停，旁边 `END` 打开「End and save」；顶端向上箭头浏览地面，记录图标查看每次时间和发现；米数在右下，拖动查看地道、点击米数回到鼹鼠。配对在 `Setup → Pair screen`。没有商店、换装、Chat 入口；兼容旧存档的数据和底层模块保留。

云端代码必须先发布，详见 `../docs/SCREEN_PAIRING.md`。只连 Wi-Fi 并不等于完成配对或已经把数据送达网页。

## 源码与验证

`Rules.h` / `Game.h` 对应网站 `journey.js` / `treasures.js`；新会话使用 `rewardVersion: 2`，旧会话继续按旧版本结算。`SyncSnapshot.h` 构建协议 v3；`EumoNetwork.h` 执行 HTTPS、扫描 Wi-Fi 和配对；`MinimalUI.h` 是当前显示界面。

`node generate-assets.cjs` 从仓库原像素绘制代码生成 Catalog.h 和 Sprites.h。保留驱动及字体版权声明。设备现有小字号字体是此前的 Pixelify Sans；本分支不回退原网站现在使用的 Silver 字体。

在 Windows 设置以下环境变量，再执行 `node tests/run.cjs`：

- `CXX`：clang++ 或 Zig 0.14.1 可执行文件的绝对路径；测试脚本会对 Zig 添加 `c++` 参数。
- `ARDUINOJSON_INCLUDE`：ArduinoJson 7.4.2 的 `src` 目录。

测试生成临时模拟存档、JSON 和 SVG，只在 `hardware/tests` 下，不读取或修改实体设备。编译、数据库测试和浏览器模拟通过，不代表已经部署服务器或刷写你的设备。
