import type { CabinetChromeContext } from "../components/CabinetChromeLayout";
import { ContractorTalentMatcherPanel, ProforientationResultsTable } from "../components/ProforientationEmployerPanels";

/** Контент страницы /page4/proforientation */
export function Page4ContractorProforientationMain({ ctx }: { ctx: CabinetChromeContext }) {
  const { styles, layoutStyles, profilePlaque } = ctx;
  return (
    <section style={layoutStyles.section}>
      <ContractorTalentMatcherPanel
        styles={styles}
        layoutStyles={layoutStyles}
        contractorEmail={profilePlaque.email}
      />
      <ProforientationResultsTable styles={styles} layoutStyles={layoutStyles} />
    </section>
  );
}
