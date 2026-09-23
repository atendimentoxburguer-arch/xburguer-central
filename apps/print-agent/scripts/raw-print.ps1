param(
  [Parameter(Mandatory=$true)][string]$PrinterName,
  [Parameter(Mandatory=$true)][string]$FilePath,
  [string]$DocumentName="X Burguer"
)
$ErrorActionPreference="Stop"
if(-not (Test-Path -LiteralPath $FilePath)){ throw "Arquivo RAW nao encontrado." }

Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class XBRawPrinter {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }
    [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In] DOCINFOA di);
    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static void Send(string printerName, string filePath, string documentName) {
        byte[] bytes = File.ReadAllBytes(filePath);
        IntPtr hPrinter;
        if(!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
            throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "Nao foi possivel abrir a impressora.");
        try {
            DOCINFOA di = new DOCINFOA();
            di.pDocName = documentName;
            di.pDataType = "RAW";
            if(!StartDocPrinter(hPrinter, 1, di))
                throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "StartDocPrinter falhou.");
            try {
                if(!StartPagePrinter(hPrinter))
                    throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "StartPagePrinter falhou.");
                try {
                    IntPtr unmanaged = Marshal.AllocCoTaskMem(bytes.Length);
                    try {
                        Marshal.Copy(bytes, 0, unmanaged, bytes.Length);
                        int written;
                        if(!WritePrinter(hPrinter, unmanaged, bytes.Length, out written) || written != bytes.Length)
                            throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "WritePrinter falhou.");
                    } finally { Marshal.FreeCoTaskMem(unmanaged); }
                } finally { EndPagePrinter(hPrinter); }
            } finally { EndDocPrinter(hPrinter); }
        } finally { ClosePrinter(hPrinter); }
    }
}
"@

[XBRawPrinter]::Send($PrinterName, $FilePath, $DocumentName)
