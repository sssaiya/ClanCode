import {
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  EventEmitter,
  Event,
} from "vscode";
import { UserStatus } from "./extension";
import path = require("path");

class myItem extends TreeItem {
  constructor(
    public readonly label: string,
    private status: string,
    public readonly collapsibleState: TreeItemCollapsibleState,
    private score: number
  ) {
    super(label, collapsibleState);
  }

  get tooltip(): string {
    return `${this.label}-${this.status}`;
  }

  get description(): string {
    if (this.status == "online") return this.status + ", score - " + this.score;
    return this.status;
  }

  public readonly iconPath = {
    light: path.join(__filename, "..", "..", "images", "test.svg"),
    dark: path.join(__filename, "..", "..", "images", "test.svg"),
  };
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
          TreeItemCollapsibleState.Collapsed,
          userStatus.score
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
