# Waveshare ESP32-S3-Touch-LCD-1.69

屏幕 240 × 280，板载 ESP32-S3、16 MB Flash、8 MB PSRAM。使用板内已经连接的屏幕和触摸，不需要再接旧的 ESP32 或 1.44 英寸 HAT。

用 Arduino IDE 打开 `Eumo169/Eumo169.ino`（同目录全部文件需要保留）。Espressif ESP32 开发板包 3.3.12，开发板选择 **Waveshare ESP32-S3 Touch LCD 1.69**，PSRAM **Enabled**，USB CDC On Boot **Enabled**；库管理器安装 **ArduinoJson 7.4.2**。LCD 驱动随源码提供。选择实际出现的串口后上传。

已验证的 CLI 编译参数：

```text
arduino-cli compile --fqbn esp32:esp32:waveshare_esp32_s3_touch_lcd_169:CDCOnBoot=cdc,PSRAM=enabled Eumo169
```

已有设备更新必须保持原分区表，不能执行 erase-flash / 全盘格式化。此分区的 FFat 从 `0x610000` 开始，大小 `0x9E0000`；NVS 保存 Wi-Fi 与设备身份。不删除这些数据，结束和暂停也不会清空已有时间、深度或收获。操作硬件前先保存当前会话并备份存档。

屏幕驱动：SPI DC=4 / CS=5 / SCK=6 / MOSI=7 / RST=8 / BL=15，ST7789 240×280、Y 偏移 20。触摸 I²C SDA=11 / SCL=10 / RST=13 / IRQ=14。代码针对此型号，不能直接烧录到旧 ESP32-WROOM 板。

主界面：左下三角形开始 / 双竖线暂停，旁边 `END` 打开「End and save」；顶端向上箭头浏览地面，记录图标查看每次时间和发现；米数在右下，拖动查看地道、点击米数回到鼹鼠。点左上角 `⋮` 打开 `Setup`，设置页只有两个大入口：Wi-Fi 图标和与网页同名的 `Connect your canele`，下方为返回键。配对进入 `Connect your canele`；Wi-Fi 图标进入附近网络列表。设置页不再提供 `Save progress` 或 `Display test`，存档仍由程序自动保存。没有商店、换装、Chat 入口；兼容旧存档的数据和底层模块保留。

右上角显示倒计时，格式与网页一致，例如 `60:00`。点击倒计时打开独立的时间设置页：未开始时按 `−` / `+` 每次调整 5 分钟，范围为 5–120 分钟，修改后自动保存；学习中或暂停时只能 `+5` 延长本次计划，上限为 120 分钟，不能缩短，演示会话不能延长。返回鼹鼠画面后点开始即可运行；调整计划不会重置已经记录的时间、深度、会话 ID 或奖励。倒计时到零会完成并保存一次，记录中仍保留实际学习时长。新版同步接口和网页会显示设备上报的剩余时间；旧版接口或固件没有倒计时字段时，网页继续使用原来的已用时显示。

Wi-Fi 先扫描并选择网络，再输入密码，不必手写网络名称。密码键盘采用大按键：字母先选 `abc` / `def` 等分组，再在最多四个大字符键中选一个；符号同样先选组再选字符。`Keys` 打开小写、大写、数字、符号四个模式；数字可直接点击。字母分组键为 68 × 44 px，字符选择键为 104 × 64 px，数字键为 48 × 44 px；底部保留 `Keys` / `Back`、`Delete`、`Join`。密码默认隐藏，可点 `Show` / `Hide` 查看或隐藏；空密码时 `Join` 不可点。左上返回先退出当前选字层，再返回网络列表；输入保留大小写、空格和英文符号，最长 63 字符。开放网络在列表中选择后直接连接。

`End and save` 保存并结束后，鼹鼠和画面自动返回地面；计时自然结束也一样。暂停仍停在挖掘位置。已有深度、时间和地道保留，可拖动查看旧地道；再次开始从已挖最深处继续，记录通过顶端记录图标查看。

挖洞场景放大 15%，触摸范围和拖动距离随场景缩放；时间、右下米数和操作按钮不缩放。开机播放网页原有 EUMO 标志、花草背景与约 1.44 秒的进入/淡出动画，主循环继续处理计时和联网。设置文字使用 DM Sans 半粗体，配对码单独使用 40 px 字号并保留前导零。

云端代码必须先发布，详见 `../docs/SCREEN_PAIRING.md`。只连 Wi-Fi 并不等于完成配对或已经把数据送达网页。

网页备份往返导入保留原始会话 ID；已由其他设备同步到网页的记录也会保留来源 ID，避免回传时被当作新的学习奖励。固件不会重置已有深度、时间、收获、FFat 或 NVS 来修复同步。若旧备份缺少对应历史，或同一个会话 ID 存在不同结算结果，会显示 `Backup history incomplete; sync paused` / `Backup history conflicts; sync paused` 并暂停同步及生成配对码。原有存档仍保留，需先导出备份并人工核对，不应靠清空存档或计数器解除提示。

## 源码与验证

`Rules.h` / `Game.h` 对应网站 `journey.js` / `treasures.js`；新会话使用 `rewardVersion: 2`，旧会话继续按旧版本结算。`SyncSnapshot.h` 构建协议 v3；`EumoNetwork.h` 执行 HTTPS、扫描 Wi-Fi 和配对；`MinimalUI.h` 是当前显示界面。

`node generate-assets.cjs` 从仓库原像素绘制代码生成 Catalog.h 和 Sprites.h。保留驱动及字体版权声明。`python hardware/generate_ui_font.py`（仓库根目录运行，需 Pillow）从仓库已有 DM Sans 生成易读设备字体；网页字体保持原样。`node hardware/generate_startup_assets.cjs` 从原网页 SVG、CSS 与花草图片生成设备开屏资源，需 Chrome、Python/Pillow；可通过 `CHROME_PATH` 指定浏览器。生成资源已经提交，普通 Arduino 编译无需再运行生成器。

在 Windows 设置以下环境变量，再执行 `node tests/run.cjs`：

- `CXX`：clang++ 或 Zig 0.14.1 可执行文件的绝对路径；测试脚本会对 Zig 添加 `c++` 参数。
- `ARDUINOJSON_INCLUDE`：ArduinoJson 7.4.2 的 `src` 目录。

Linux/macOS 使用相同测试；从仓库根目录运行：

```sh
ARDUINOJSON_INCLUDE=/path/to/ArduinoJson/src CXX=g++ node hardware/tests/run.cjs
```

也可将 `CXX` 换成 `clang++`。测试使用真实 `Game.h`，包括 848 组原网页奖励规则对照、备份往返去重、会话完成日期和缺失历史保护；HTTP、Wi-Fi 和屏幕触摸的真实设备联调仍须另行验证。

测试生成临时模拟存档、JSON 和 SVG，只在 `hardware/tests` 下，不读取或修改实体设备。编译、数据库测试和浏览器模拟通过，不代表已经部署服务器或刷写你的设备。
