import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

/**
 * Getting a report off the device. On the web the browser saves the CSV and
 * opens its print dialog for the PDF ("Save as PDF"). On a phone the PDF is
 * written to a file and handed to the share sheet; the CSV goes to the share
 * sheet as text (expo-file-system is not installed, and adding a native module
 * means a new build).
 */

export async function saveCsv(fileName: string, text: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([`﻿${text}`], { type: 'text/csv;charset=utf-8' }); // BOM: Excel reads UTF-8
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  await Share.share({ title: fileName, message: text });
}

export async function savePdf(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  } else {
    await Print.printAsync({ uri });
  }
}

/** A file name that sorts by date and survives every file system. */
export const fileName = (who: string, ext: string, now = new Date()) =>
  `cognicare-${
    who
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'report'
  }-${now.toISOString().slice(0, 10)}.${ext}`;
