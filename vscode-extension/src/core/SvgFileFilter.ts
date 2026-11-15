/** Decides which Explorer entries are SVG files: a regular file whose name ends in `.svg` (any case). */
export class SvgFileFilter {
  isSvgName(path: string): boolean { return /\.svg$/i.test(path); }
  isSvgFile(path: string, isRegularFile: boolean): boolean { return isRegularFile && this.isSvgName(path); }
}
