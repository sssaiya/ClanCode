import {
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  EventEmitter,
  Event,
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

  getTreeItem(element: myItem): TreeItem | Thenable<myItem> {
    return element;
  }
  getChildren(element?: myItem | undefined): ProviderResult<myItem[]> {
    if (element == undefined) {
      // User element
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
    } else {
      // Add actions other stuff here (Shown on click)
    }
  }

  private _onDidChangeTreeData: EventEmitter<
    myItem | undefined
  > = new EventEmitter<myItem | undefined>();

  readonly onDidChangeTreeData: Event<myItem | undefined> = this
    ._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}
