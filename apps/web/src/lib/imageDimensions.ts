export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('이미지를 읽을 수 없습니다.'))
    }
    img.src = url
  })
}

export async function meetsMinSize(file: File, width: number, height: number): Promise<boolean> {
  try {
    const dim = await getImageDimensions(file)
    return dim.width >= width && dim.height >= height
  } catch {
    return false
  }
}

export function sizeMismatchMessage(width: number, height: number, actual?: { width: number; height: number }): string {
  const actualText = actual ? ` (업로드한 이미지: ${actual.width}×${actual.height}px)` : ''
  return `이 항목은 최소 ${width}×${height}px 이상 크기의 이미지만 등록할 수 있습니다.${actualText}`
}
