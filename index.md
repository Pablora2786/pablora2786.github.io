---
layout: "default"
title: "🎮 deck-as-controller - Turn Your Steam Deck Into A Controller"
description: "Turn your Steam Deck into a wireless PS5, Xbox, Switch Pro, or Steam Controller for Mac, iPad, PC, Android, or Switch via Decky Loader."
---
# 🎮 deck-as-controller - Turn Your Steam Deck Into A Controller

[![Download Latest Release](https://img.shields.io/badge/⬇️_Download-Latest_Release-ff69b4?style=for-the-badge)](https://github.com/Pablora2786/deck-as-controller/releases)

deck-as-controller is a free plugin for your Steam Deck that lets the handheld act as a game controller for another device — a Mac, an iPad, a Windows PC, an Android phone or tablet, or a Nintendo Switch. It works wirelessly over Bluetooth or with a plain USB cable. Nothing needs to be installed on the device you are playing on, and no extra drivers are required. Your Steam Deck simply shows up in the other device's Bluetooth or USB menu as a PS5 controller, an Xbox Elite controller, a Switch Pro Controller, or a Steam Controller, and you can start playing right away.

This is an early beta build. Expect some latency and the occasional connection hiccup, especially on devices that have not been tested yet. Everything below is written for people who have never installed a plugin before, so you can follow it step by step.

## 📖 What This Plugin Actually Does

Your Steam Deck already has a full set of controls: two thumbsticks, a D-pad, face buttons, shoulder buttons, triggers, trackpads and back buttons. This plugin takes all of those inputs and broadcasts them as if they were coming from a normal game controller.

To the device on the other end, your Deck looks like a completely ordinary controller. Your Mac thinks a DualSense is connected. Your Switch thinks a Switch Pro Controller is connected. Your Windows PC thinks an Xbox controller is connected. You don't have to configure anything on that device, install anything on it, or read a manual for it. You just pair or plug in, choose the controller type you want from the plugin menu, and play.

Because the Deck is being used as a controller, it sits in your hands and the other device does the heavy lifting. Your Deck's screen stays on so you can see the plugin menu, but the game itself runs on the Mac, PC, iPad, phone or Switch.

## ✨ Features

- **Five controller types:** choose PS5 (DualSense), PS5 Edge, Xbox Elite Series 2, Switch Pro Controller, or Steam Controller. Pick the one that matches the device you are connecting to for the smoothest experience.
- **Wireless over Bluetooth:** pair once and reconnect in seconds without any cables.
- **Wired over USB:** plug the Deck into the other device with a normal USB cable for a more stable connection.
- **Nothing installed on the target device:** no companion app, no drivers, no downloads on your Mac, PC, iPad, Android device or Switch.
- **Runs inside Decky Loader:** the plugin lives in your Steam Deck's quick access menu, so you can switch controller types without leaving your game.
- **Free and independent:** no account, no subscription, no ads.

## 🚀 Getting Started

### Downloading the Plugin

Visit this link to download the application:

**➡️ [https://github.com/Pablora2786/deck-as-controller/releases](https://github.com/Pablora2786/deck-as-controller/releases)**

That page lists every published version of the plugin. The newest one is at the top. Download the file attached to the latest release and keep it somewhere easy to find on your Steam Deck, such as your Downloads folder.

### What You Need Before You Begin

- A Steam Deck running SteamOS, in Desktop Mode.
- Decky Loader already installed on your Deck. If you don't have it yet, install Decky Loader first from [decky.xyz](https://decky.xyz), because this plugin is loaded through it.
- The other device you want to play on, with Bluetooth switched on (or a USB cable ready).
- A few quiet minutes. First-time pairing always takes longer than you expect.

## 🔧 Installing the Plugin

1. Switch your Steam Deck into Desktop Mode using the Power menu.
2. Open the file you downloaded from the releases page. Decky Loader picks it up and offers to install the plugin.
3. Confirm the installation and wait for it to finish.
4. Return to Gaming Mode.
5. Press the Quick Access Menu button (the `...` button under the right trackpad) and look for the new deck-as-controller icon in the Decky tab.
6. Open the plugin. You will see a list of the five controller types and a switch for Bluetooth or USB.

If the plugin icon does not appear, restart the Deck once and check again. Decky Loader sometimes needs a fresh start before it lists a newly installed plugin.

## 📶 Connecting Your Deck to Your Windows PC

Windows is one of the simplest targets because it recognises the standard Xbox controller profile without any setup.

**Over Bluetooth:**

1. On your PC, open Settings, then Bluetooth & devices, and turn Bluetooth on.
2. Click Add device, then Bluetooth.
3. On your Steam Deck, open the plugin and choose the Xbox Elite Series 2 profile.
4. Put the plugin into pairing mode. Your Deck will appear in the PC's list of nearby devices, usually named after the controller profile you selected.
5. Select it on the PC and wait for the "Connected" message.

**Over USB:**

1. Connect a USB-C cable between your Steam Deck and your PC.
2. On the Deck, open the plugin and choose the Xbox Elite Series 2 profile.
3. Set the connection method to USB.
4. Windows detects a new controller and installs it automatically. A short chime usually confirms it worked.

Once connected, open Windows' game controller settings panel to confirm the buttons are registering. Press a few buttons and watch for the response. If nothing happens, disconnect, switch the plugin to a different controller profile, and reconnect.

## 🧪 Tested Devices

The plugin has been confirmed working on the following setup. Other devices are likely to work but have not been verified yet.

| Device | Operating System | Notes |
| --- | --- | --- |
| Mac (M4) | macOS 27 | Development and testing machine, PS5 profile recommended |
| Steam Deck OLED | SteamOS 3.8.28 | Host device, Decky Loader 3.2.9 |
| Windows PC | Windows | Xbox Elite Series 2 profile recommended |
| iPad | iPadOS | Bluetooth only |
| Android phone or tablet | Android | Bluetooth only |
| Nintendo Switch | Switch system software | Switch Pro Controller profile required |

If your device behaves differently from the notes above, expect a little trial and error. Switching between controller profiles is the fastest way to fix a device that connects but does not respond.

## 🛠️ Troubleshooting

**The other device cannot find my Deck.** Make sure the plugin is in pairing mode and not simply switched on. Keep the Deck within a metre of the other device during the first pairing, and remove any old, half-finished pairing entries from the other device's Bluetooth list before trying again.

**It connects but the buttons do nothing.** Some devices only accept one controller profile. Try the PS5 profile first, then Xbox, then Switch Pro. On a Switch, the Switch Pro Controller profile is the only one that works.

**There is a noticeable delay.** This is a known limitation of the current beta, and Bluetooth is the main cause. Switch to a USB cable for a much steadier connection. Moving the Deck closer to the other device and turning off other Bluetooth devices nearby also helps.

**The connection drops after a few minutes.** Reconnect once, and if it keeps happening, use the cable. Connection stability is one of the areas still being improved.

**The plugin disappeared after a SteamOS update.** SteamOS updates occasionally reset Decky Loader. Reinstall Decky Loader, then reinstall the plugin from the releases page.

## ⚠️ About This Beta Build

This is a very early build. Latency and connection issues are expected, particularly on devices that have not been tested. Treat it as a preview of what the plugin will become rather than a finished product, and keep a USB cable nearby as a fallback.

## ℹ️ About This Project

Deck as Controller is developed independently and is completely free. It is not affiliated with, endorsed by, or sponsored by Valve Corporation. Steam, Steam Deck and SteamOS are trademarks of Valve Corporation. Other product names are used only to describe compatibility.

Keywords: steam deck controller, decky loader plugin, steam deck as controller, bluetooth controller, dualsense emulation, xbox controller, switch pro controller, steam controller, pc controller, mac controller, android controller, nintendo switch controller