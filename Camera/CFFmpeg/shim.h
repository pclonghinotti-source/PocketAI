#ifndef POCKETAI_CFFMPEG_SHIM_H
#define POCKETAI_CFFMPEG_SHIM_H

// Cabeçalhos do FFmpeg expostos ao Swift via o módulo `CFFmpeg`.
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/avutil.h>
#include <libavutil/error.h>
#include <libavutil/dict.h>
#include <libavutil/opt.h>
#include <libavutil/rational.h>

// O Swift NÃO importa macros "function-like" (AVERROR, AVERROR_EOF, AV_NOPTS_VALUE).
// Expomos como funções inline para poder compará-las do lado Swift.
static inline int     pai_averror(int e)         { return AVERROR(e); }
static inline int     pai_averror_eof(void)      { return AVERROR_EOF; }
static inline int     pai_averror_eagain(void)   { return AVERROR(EAGAIN); }
static inline int64_t pai_av_nopts_value(void)   { return AV_NOPTS_VALUE; }

#endif /* POCKETAI_CFFMPEG_SHIM_H */
