import {
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import { UserStatus } from "./extension";

class myItem extends TreeItem {
  constructor(
    public readonly label: string,
    private status: string,
    public readonly collapsibleState: TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }

  get tooltip(): string {
    return `${this.label}-${this.status}`;
  }

  get description(): string {
    return this.status;
  }
}

export class myTreeDataProvider implements TreeDataProvider<myItem> {
  constructor(private ClanStatusArray: Map<string, UserStatus>) {}
  // onDidChangeTreeData?: Event<void | Command | null | undefined> | undefined;
  getTreeItem(element: myItem): TreeItem | Thenable<myItem> {
    return element;
  }
  getChildren(element?: myItem | undefined): ProviderResult<myItem[]> {
    var items: Array<myItem> = [];
    this.ClanStatusArray.forEach((userStatus) => {
      const item = new myItem(
        userStatus.username,
        userStatus.status,
        TreeItemCollapsibleState.Collapsed
      );
      items.push(item);
    });

    return Promise.resolve(items);
  }
}
