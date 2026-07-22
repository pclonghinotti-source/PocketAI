#!/usr/bin/env bash
#
# build-ffmpeg.sh — compila um FFmpeg MÍNIMO (LGPL) como XCFramework para iOS.
#
# Filosofia (decisão fixada): FFmpeg SÓ para demux/RTSP. NÃO habilitamos decoders —
# o decode H.264/H.265 é feito em hardware pelo VideoToolbox (ver VideoToolboxDecoder.swift).
# Isso mantém o binário enxuto e alinhado com o appliance de baixo consumo.
#
# Requer: macOS + Xcode Command Line Tools. NÃO roda no Windows (é referência/tooling).
# Uso: ./build-ffmpeg.sh   (opcional: FFMPEG_VERSION=n7.1 ./build-ffmpeg.sh)
#
set -euo pipefail

FFMPEG_VERSION="${FFMPEG_VERSION:-n7.1}"
MIN_IOS="16.0"

ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/.ffmpeg-src"
WORK="$ROOT/.ffmpeg-build"
OUT="$ROOT/../Camera/CFFmpeg/FFmpeg.xcframework"

# Config LGPL mínima: sem --enable-gpl / --enable-nonfree para manter distribuível.
COMMON=(
  --disable-everything
  --disable-programs --disable-doc --disable-debug --disable-sdl2
  --disable-avdevice --disable-swscale --disable-swresample --disable-postproc
  --disable-encoders --disable-decoders --disable-muxers --disable-filters
  --enable-avformat --enable-avcodec --enable-avutil
  --enable-network
  --enable-protocol=tcp,udp,rtp,rtsp,file,tls,https,http
  --enable-demuxer=rtsp,sdp,rtp,mov,mpegts
  --enable-parser=h264,hevc
  --enable-bsf=h264_mp4toannexb,hevc_mp4toannexb,extract_extradata
  --enable-pic --enable-cross-compile
  --disable-audiotoolbox --disable-videotoolbox
)

clone_ffmpeg() {
  if [ ! -d "$SRC" ]; then
    git clone --depth 1 --branch "$FFMPEG_VERSION" https://github.com/FFmpeg/FFmpeg.git "$SRC"
  fi
}

# build_arch <sdk> <arch> <target-os>
build_arch() {
  local sdk="$1" arch="$2" prefix="$WORK/$sdk-$arch"
  local sysroot; sysroot="$(xcrun --sdk "$sdk" --show-sdk-path)"
  local cc; cc="$(xcrun --sdk "$sdk" -f clang)"
  local minflag
  if [ "$sdk" = "iphonesimulator" ]; then
    minflag="-mios-simulator-version-min=$MIN_IOS"
  else
    minflag="-mios-version-min=$MIN_IOS"
  fi

  ( cd "$SRC" && make distclean >/dev/null 2>&1 || true )
  ( cd "$SRC" && ./configure \
      "${COMMON[@]}" \
      --prefix="$prefix" \
      --target-os=darwin \
      --arch="$arch" \
      --cc="$cc" \
      --sysroot="$sysroot" \
      --extra-cflags="-arch $arch $minflag -fno-common" \
      --extra-ldflags="-arch $arch $minflag" \
    && make -j"$(sysctl -n hw.ncpu)" \
    && make install )
}

# Junta libs estáticas de N arquiteturas de um MESMO sdk num diretório lipo.
lipo_sdk() {
  local sdk="$1"; shift
  local archs=("$@")
  local dest="$WORK/$sdk-universal"
  mkdir -p "$dest/lib"
  # headers são iguais entre arquiteturas: copia de uma delas
  cp -R "$WORK/$sdk-${archs[0]}/include" "$dest/include"
  for lib in libavformat libavcodec libavutil; do
    local inputs=()
    for a in "${archs[@]}"; do inputs+=("$WORK/$sdk-$a/lib/$lib.a"); done
    lipo -create "${inputs[@]}" -output "$dest/lib/$lib.a"
  done
  # Empacota as 3 libs numa só para simplificar o -library do xcframework.
  libtool -static -o "$dest/libffmpeg.a" "$dest"/lib/*.a
}

main() {
  clone_ffmpeg

  build_arch iphoneos        arm64
  build_arch iphonesimulator arm64
  build_arch iphonesimulator x86_64

  lipo_sdk iphoneos        arm64
  lipo_sdk iphonesimulator arm64 x86_64

  rm -rf "$OUT"
  xcodebuild -create-xcframework \
    -library "$WORK/iphoneos-universal/libffmpeg.a"        -headers "$WORK/iphoneos-universal/include" \
    -library "$WORK/iphonesimulator-universal/libffmpeg.a" -headers "$WORK/iphonesimulator-universal/include" \
    -output "$OUT"

  echo "✅ Gerado: $OUT"
  echo "   Adicione-o ao target no Xcode e mantenha CFFmpeg/module.modulemap no import path."
}

main "$@"
