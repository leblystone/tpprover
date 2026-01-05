# 🔧 Android Emulator Hypervisor Driver Fix Guide

## ❌ **Error You're Seeing**

```
[SC] ControlService FAILED 1062: The service has not been started.
[SC] DeleteService SUCCESS
[SC] StartService FAILED with error 4294967201.
```

This error indicates a Windows virtualization conflict preventing the Android Emulator hypervisor driver from starting.

---

## ✅ **Solution Steps (Try in Order)**

### **Step 1: Run as Administrator** ⚡ *Quick Fix - Try This First*

1. **Close Android Studio completely**
2. **Right-click** on **Command Prompt** or **PowerShell**
3. Select **"Run as administrator"**
4. Navigate to your Android SDK location:
   ```powershell
   cd "C:\Users\lebro\AppData\Local\Android\Sdk\extras\google\Android_Emulator_Hypervisor_Driver"
   ```
5. Run the installer manually:
   ```powershell
   .\silent_install.bat
   ```
   OR
   ```powershell
   .\install.bat
   ```

---

### **Step 2: Disable Hyper-V** 🔄 *Most Common Fix*

Hyper-V conflicts with the Android Emulator hypervisor driver.

1. **Open PowerShell as Administrator**
2. Run this command:
   ```powershell
   bcdedit /set hypervisorlaunchtype off
   ```
3. **Restart your computer** (required!)
4. After restart, try installing the driver again

**Note:** If you need Hyper-V for other purposes (WSL2, Docker Desktop), you may need to use an alternative emulator acceleration method.

---

### **Step 3: Enable Windows Hypervisor Platform (WHPX)** 🚀 *Alternative to Disabling Hyper-V*

If you need to keep Hyper-V enabled, use Windows Hypervisor Platform instead:

1. **Open PowerShell as Administrator**
2. Run:
   ```powershell
   Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform
   ```
3. **Restart your computer**
4. In Android Studio, go to **Tools > SDK Manager > SDK Tools**
5. Uncheck **"Android Emulator Hypervisor Driver"** (we won't use it)
6. Use **HAXM** or **WHPX** acceleration instead

---

### **Step 4: Check BIOS Virtualization Settings** ⚙️

1. **Restart your computer**
2. **Enter BIOS** (usually F2, F10, DEL, or ESC during boot)
3. Navigate to **CPU** or **Advanced** settings
4. Enable:
   - **Intel Virtualization Technology (VT-x)** (for Intel CPUs)
   - **AMD-V** (for AMD CPUs)
5. **Save and exit** BIOS
6. Boot into Windows and try again

---

### **Step 5: Install Visual C++ Redistributables** 📦

Missing DLLs can cause silent failures:

1. Download and install:
   - [VC_redist.x64.exe](https://aka.ms/vs/17/release/vc_redist.x64.exe)
   - [VC_redist.x86.exe](https://aka.ms/vs/17/release/vc_redist.x86.exe)
2. **Restart your computer**
3. Try installing the driver again

---

### **Step 6: Verify Installation** ✅

After applying fixes, verify the driver is working:

1. **Open PowerShell as Administrator**
2. Check driver status:
   ```powershell
   sc query aehd
   ```
3. **Expected output:**
   ```
   SERVICE_NAME: aehd
   STATE              : 4  RUNNING
   ```
4. If it shows **RUNNING**, you're good to go! 🎉

---

## 🔄 **Alternative: Use Software Acceleration**

If hardware acceleration continues to fail, you can use software acceleration (slower but works):

1. In Android Studio, go to **Tools > SDK Manager > SDK Tools**
2. Uncheck **"Android Emulator Hypervisor Driver"**
3. When creating/editing an AVD, select **"Software - GLES 2.0"** for graphics
4. The emulator will run slower but will work

---

## 🎯 **Recommended Solution for Your Setup**

Based on your error, try this order:

1. ✅ **First:** Run Android Studio SDK Manager as Administrator
2. ✅ **Second:** Disable Hyper-V (if you don't need it):
   ```powershell
   bcdedit /set hypervisorlaunchtype off
   ```
   Then restart
3. ✅ **Third:** Install Visual C++ Redistributables
4. ✅ **Fourth:** Check BIOS virtualization settings

---

## 📝 **Quick Command Reference**

```powershell
# Check if Hyper-V is enabled
bcdedit /enum | findstr hypervisor

# Disable Hyper-V
bcdedit /set hypervisorlaunchtype off

# Enable Hyper-V (if needed later)
bcdedit /set hypervisorlaunchtype auto

# Check hypervisor driver status
sc query aehd

# Enable Windows Hypervisor Platform (alternative)
Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform
```

---

## 🆘 **Still Having Issues?**

If none of these work:

1. **Check Windows version:** Windows 10/11 Pro required for some virtualization features
2. **Check for conflicting software:** VMware, VirtualBox, or other virtualization tools
3. **Try Android Studio's built-in emulator manager** instead of SDK Manager
4. **Use a physical Android device** for testing (USB debugging)

---

## ✅ **Success Indicators**

You'll know it's working when:
- ✅ No error messages during driver installation
- ✅ `sc query aehd` shows **RUNNING** state
- ✅ Android emulator starts quickly
- ✅ Emulator performance is smooth

---

**🎉 Once fixed, you can proceed with:**
```bash
npm run mobile:android
```

Good luck! 🚀



