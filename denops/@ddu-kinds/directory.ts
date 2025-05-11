import {
  ActionFlags,
  Actions,
  BaseKind,
  DduItem,
  PreviewContext,
  Previewer,
} from "https://deno.land/x/ddu_vim@v3.10.1/types.ts";
import { Denops } from "https://deno.land/x/denops_core@v5.0.0/denops.ts";

type Params = Record<never, never>;

export class Kind extends BaseKind<Params> {
  override actions: Actions<Params> = {
    open: async (args: { denops: Denops; items: DduItem[] }) => {
      // Save current position.
      await args.denops.cmd("normal! m`");

      for (const i of args.items) {
        await args.denops.cmd(
          "edit " + i.action.path,
        );
      }
      return ActionFlags.None;
    },

    restart: async (args: { denops: Denops; items: DduItem[] }) => {
      const sources = await Promise.all(args.items.map(async (item) => {
        return await updateSourcePath(item, args.options.sources);
      }));
      await args.denops.call("ddu#start", {
        name: args.options.name,
        push: false,
        sources: sources.flat(),
      });
      return ActionFlags.None;
    },

    chdir: async (args: { denops: Denops; items: DduItem[] }) => {
      for (const i of args.items) {
        await args.denops.call("chdir", i.action.path);
      }
      return ActionFlags.None;
    },
  };

  override async getPreviewer(args: {
    denops: Denops;
    item: DduItem;
    actionParams: BaseParams;
    previewContext: PreviewContext;
  }): Promise<Previewer | undefined> {
    const action = args.item.action as ActionData;
    if (!action) {
      return undefined;
    }

    // const param = ensure(args.actionParams, is.Record) as PreviewOption;
    const dirs = [];
    for await (const file of Deno.readDir(action.path)) {
      dirs.push(file.name);
    }

    return {
      kind: "nofile",
      contents: dirs,
    };
  }
  override params(): Params {
    return {};
  }
}

const updateSourcePath = async (item: DduItem, sources) => {
  const action = item?.action as ActionData;
  const retSources = [];

  // NOTE: Deno.stat() may be failed
  try {
    const path = action.path;
    if ((await Deno.stat(path)).isDirectory) {
      for (const source of sources) {
        retSources.push({ ...source, ...{ options: { path: path } } });
      }
    }
  } catch (_e: unknown) {
    // Ignore
  }
  return retSources;
};
