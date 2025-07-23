import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';

interface QRCodeWithLogoProps {
  value: string;
  size?: number;
  id?: string;
  showLogo?: boolean; // 控制是否显示logo
  logoText?: string; // 自定义logo文字
}

const QRCodeWithLogo: React.FC<QRCodeWithLogoProps> = ({ 
  value, 
  size = 140,
  id = 'qr-code-styled',
  showLogo = true,
  logoText = 'AIDR'
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // 根据二维码尺寸动态计算logo大小和padding
  const logoSize = Math.max(6, Math.min(14, size * 0.07)); // logo字体大小：二维码尺寸的7%，最小6px，最大14px
  const logoPadding = Math.max(1, size * 0.012); // padding：二维码尺寸的1.2%，最小1px
  const logoRadius = Math.max(2, size * 0.018); // 圆角：二维码尺寸的1.8%，最小2px
  
  // 计算logo的最大尺寸 - 确保不会影响二维码的可读性
  const maxLogoSize = size * 0.2; // logo最大尺寸不超过二维码的20%

  useEffect(() => {
    const initializeQR = async () => {
      try {
        if (!qrCodeRef.current) {
          qrCodeRef.current = new QRCodeStyling({
            width: size,
            height: size,
            data: value,
            // 不使用QRCodeStyling的内置logo功能，而是使用覆盖层
            image: undefined,
            dotsOptions: {
              color: "#000000",
              type: "rounded"
            },
            backgroundOptions: {
              color: "#ffffff",
            },
            cornersSquareOptions: {
              color: "#000000",
              type: "extra-rounded"
            },
            cornersDotOptions: {
              color: "#000000",
              type: "dot"
            },
            qrOptions: {
              errorCorrectionLevel: "H" // 最高容错级别，允许更多的logo覆盖
            }
          });
        } else {
          qrCodeRef.current.update({
            data: value,
            width: size,
            height: size
          });
        }

        if (ref.current && qrCodeRef.current) {
          // 清空之前的内容
          ref.current.innerHTML = '';
          await qrCodeRef.current.append(ref.current);
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('二维码生成失败:', error);
      }
    };

    initializeQR();
  }, [value, size]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div ref={ref} id={id} style={{ 
        opacity: isLoaded ? 1 : 0.7,
        transition: 'opacity 0.3s ease'
      }} />
      {/* 在二维码中心添加logo文字标记 - 尺寸根据二维码大小动态调整 */}
      {showLogo && isLoaded && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: `${logoPadding}px ${logoPadding * 2}px`,
            borderRadius: `${logoRadius}px`,
            fontSize: `${logoSize}px`,
            fontWeight: 'bold',
            color: '#4299E1',
            border: '1px solid #4299E1',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(2px)',
            // 确保logo不会太大影响扫描
            maxWidth: `${maxLogoSize}px`,
            maxHeight: `${maxLogoSize}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center' as const,
            lineHeight: '1',
            zIndex: 10,
            // 如果logo文字太长，自动调整字体大小
            minWidth: 'max-content',
            whiteSpace: 'nowrap' as const,
            // 添加平滑的淡入效果
            opacity: 1,
            transition: 'opacity 0.5s ease-in-out'
          }}
        >
          {logoText}
        </div>
      )}
    </div>
  );
};

export default QRCodeWithLogo; 