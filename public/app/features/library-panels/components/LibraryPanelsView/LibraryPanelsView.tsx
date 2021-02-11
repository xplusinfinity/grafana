import { Icon, Input, Select, Button, stylesFactory, useStyles } from '@grafana/ui';
import React, { useEffect, useState } from 'react';
import { useDebounce } from 'react-use';
import { cx, css } from 'emotion';
import { LibraryPanelCard } from '../LibraryPanelCard/LibraryPanelCard';
import { GrafanaTheme } from '@grafana/data';
import { getLibrarySrv, LibraryPanelDTO } from 'app/core/services/library_srv';

// Temporary type until LibraryPanelDTO contains connected dashboards info.
export type LibraryPanelInfo = LibraryPanelDTO & { connectedDashboards: number[] };
interface LibraryPanelViewProps {
  className?: string;
  onCreateNewPanel?: () => void;
  children: (panel: LibraryPanelInfo, i: number) => JSX.Element | JSX.Element[];
  formatDate?: (dateString: string) => string;
}

export const LibraryPanelsView: React.FC<LibraryPanelViewProps> = ({
  children,
  className,
  onCreateNewPanel,
  formatDate,
}) => {
  const styles = useStyles(getPanelViewStyles);
  const [searchString, setSearchString] = useState('');
  // const [modalOpen, setModalOpen] = useState(false);

  // Deliberately not using useAsync here as we want to be able to update libraryPanels without
  // making an additional API request (for example when a user deletes a library panel and we want to update the view to reflect that)
  const [libraryPanels, setLibraryPanels] = useState<LibraryPanelInfo[] | undefined>(undefined);
  useEffect(() => {
    const libPanelsPromise = getLibrarySrv()
      .getLibraryPanels()
      .then((panels) => {
        return Promise.all(
          panels.map((panel) =>
            getLibrarySrv()
              .getLibraryPanelConnectedDashboards(panel.uid)
              .then((connected) => {
                return {
                  ...panel,
                  connectedDashboards: connected,
                };
              })
          )
        );
      });

    libPanelsPromise.then((panels) => {
      setLibraryPanels(panels);
    });
  }, []);

  const [filteredItems, setFilteredItems] = useState(libraryPanels);
  useDebounce(
    () => {
      setFilteredItems(libraryPanels?.filter((v) => v.name.toLowerCase().includes(searchString.toLowerCase())));
    },
    300,
    [searchString, libraryPanels]
  );

  const onDeletePanel = async (uid: string) => {
    try {
      await getLibrarySrv().deleteLibraryPanel(uid);
      const panelIndex = libraryPanels!.findIndex((panel) => panel.uid === uid);
      setLibraryPanels([...libraryPanels!.slice(0, panelIndex), ...libraryPanels!.slice(panelIndex + 1)]);
    } catch (err) {
      throw err;
    }
  };

  return (
    <div className={cx(styles.container, className)}>
      <div className={styles.searchHeader}>
        <Input
          className={styles.searchInput}
          placeholder="Search the panel library"
          prefix={<Icon name="search" />}
          value={searchString}
          onChange={(e) => setSearchString(e.currentTarget.value)}
        ></Input>
        <Select placeholder="Filter by" onChange={() => {}} width={35} />
      </div>
      <div className={styles.panelTitle}>Popular panels from the panel library</div>
      <div className={styles.libraryPanelList}>
        {libraryPanels === undefined ? (
          <p>Loading library panels...</p>
        ) : filteredItems?.length! < 1 ? (
          <p>No library panels found.</p>
        ) : (
          filteredItems?.map((item, i) => (
            <LibraryPanelCard
              key={`shared-panel=${i}`}
              panelInfo={item}
              // onClick={() => setModalOpen(true)}
              onDelete={() => onDeletePanel(item.uid)}
            >
              {children(item, i)}
            </LibraryPanelCard>
          ))
        )}
      </div>
      {onCreateNewPanel && (
        <Button icon="plus" className={styles.newPanelButton} onClick={onCreateNewPanel}>
          Create a new reusable panel
        </Button>
      )}
      {/* {modalOpen && (
        <VarImportModal
          vars={[
            { name: 'jobs', definition: 'label_values(job)' },
            { name: 'disk_series', definition: 'metrics(node_disk)' },
            { name: 'query', definition: 'query_result(up{job=~"$jobs"})' },
          ]}
          isOpen={modalOpen}
          onDismiss={() => setModalOpen(false)}
        />
      )} */}
    </div>
  );
};

const getPanelViewStyles = stylesFactory((theme: GrafanaTheme) => {
  return {
    container: css`
      display: flex;
      flex-direction: column;
      flex-wrap: nowrap;
      height: 100%;
    `,
    libraryPanelList: css`
      display: flex;
      gap: 8px;
      overflow-x: auto;
      flex-direction: column;
    `,
    searchHeader: css`
      display: flex;
    `,
    searchInput: css`
      margin-right: 122px;
    `,
    panelTitle: css`
      line-height: 30px;
    `,
    newPanelButton: css`
      margin-top: 10px;
      align-self: flex-start;
    `,
  };
});
