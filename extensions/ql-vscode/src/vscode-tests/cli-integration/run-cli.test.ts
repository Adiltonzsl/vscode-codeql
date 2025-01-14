import { expect } from 'chai';
import { extensions, Uri } from 'vscode';
import * as path from 'path';
import { SemVer } from 'semver';

import { CodeQLCliServer, QueryInfoByLanguage } from '../../cli';
import { CodeQLExtensionInterface } from '../../extension';
import { skipIfNoCodeQL } from '../ensureCli';
import { getOnDiskWorkspaceFolders } from '../../helpers';

/**
 * Perform proper integration tests by running the CLI
 */
describe('Use cli', function() {
  this.timeout(60000);

  let cli: CodeQLCliServer;

  beforeEach(async () => {
    const extension = await extensions.getExtension<CodeQLExtensionInterface | Record<string, never>>('GitHub.vscode-codeql')!.activate();
    if ('cliServer' in extension) {
      cli = extension.cliServer;
    } else {
      throw new Error('Extension not initialized. Make sure cli is downloaded and installed properly.');
    }
  });

  if (process.env.CLI_VERSION !== 'nightly') {
    it('should have the correct version of the cli', async () => {
      expect(
        (await cli.getVersion()).toString()
      ).to.eq(
        new SemVer(process.env.CLI_VERSION || '').toString()
      );
    });
  }

  it('should resolve ram', async () => {
    const result = await (cli as any).resolveRam(8192);
    expect(result).to.deep.eq([
      '-J-Xmx4096M',
      '--off-heap-ram=4096'
    ]);
  });

  it('should resolve query packs', async function() {
    skipIfNoCodeQL(this);
    const qlpacks = await cli.resolveQlpacks(getOnDiskWorkspaceFolders());
    // should have a bunch of qlpacks. just check that a few known ones exist
    expect(qlpacks['codeql-cpp']).not.to.be.undefined;
    expect(qlpacks['codeql-csharp']).not.to.be.undefined;
    expect(qlpacks['codeql-java']).not.to.be.undefined;
    expect(qlpacks['codeql-javascript']).not.to.be.undefined;
    expect(qlpacks['codeql-python']).not.to.be.undefined;
  });

  it('should resolve languages', async function() {
    skipIfNoCodeQL(this);
    const languages = await cli.resolveLanguages();
    for (const expectedLanguage of ['cpp', 'csharp', 'go', 'java', 'javascript', 'python']) {
      expect(languages).to.have.property(expectedLanguage).that.is.not.undefined;
    }
  });

  it('should resolve query by language', async function() {
    skipIfNoCodeQL(this);
    const queryPath = path.join(__dirname, 'data', 'simple-javascript-query.ql');
    const queryInfo: QueryInfoByLanguage = await cli.resolveQueryByLanguage(getOnDiskWorkspaceFolders(), Uri.file(queryPath));
    expect((Object.keys(queryInfo.byLanguage))[0]).to.eql('javascript');
  });
});
