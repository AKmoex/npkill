import { exec, spawn } from 'child_process';

import { FileService } from './files.service';
import { IListDirParams } from '../interfaces/list-dir-params.interface';
import { Observable } from 'rxjs';
import { StreamService } from './stream.service';
import { map } from 'rxjs/operators';

export class LinuxFilesService extends FileService {
  constructor(private streamService: StreamService) {
    super();
  }

  getFolderSize(path: string): Observable<{}> {
    const du = spawn('du', ['-s', '-b', path]);
    const cut = spawn('cut', ['-f', '1']);

    du.stdout.pipe(cut.stdin);

    return this.streamService
      .getStream(cut)
      .pipe(map(size => super.convertBytesToKB(+size)));
  }

  listDir(params: IListDirParams): Observable<Buffer> {
    const args = this.prepareFindArgs(params);

    const child = spawn('find', args);

    return this.streamService.getStream(child);
  }

  deleteDir(path: string): Promise<{}> {
    return new Promise((resolve, reject) => {
      const command = `rm -rf "${path}"`;
      exec(command, (error, stdout, stderr) => {
        if (error) return reject(error);
        if (stderr) return reject(stderr);
        resolve(stdout);
      });
    });
  }

  private prepareFindArgs(params: IListDirParams): string[] {
    const { path, target, exclude, excludePaths } = params;
    let args: string[] = [path];

    // TODO: refactor
    if (exclude) {
      args = [...args, this.prepareExcludeArgs(exclude)].flat();
    }

    if (excludePaths) {
      args = [...args, this.prepareExcludeArgs(excludePaths, '-dir')].flat();
    }

    args = [...args, '-name', target, '-type', 'd', '-prune'];

    return args;
  }

  private prepareExcludeArgs(
    exclude: string[],
    excludeParam: string = '-name',
  ): string[] {
    const excludeDirs = exclude.map((dir: string) => [
      '-not',
      '(',
      excludeParam,
      dir,
      '-prune',
      ')',
    ]);
    return excludeDirs.flat();
  }
}
