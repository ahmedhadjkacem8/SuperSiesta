import {
  BadgeCheck,
  Building2,
  Copyright,
  CreditCard,
  Headset,
  LockKeyhole,
  PackageCheck,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

const sections: { id?: string; title: string; icon: LucideIcon; content: ReactNode }[] = [
  {
    title: "Présentation de l'entreprise",
    icon: Building2,
    content: (
      <>
        <p>
          Siesta Officiel est une entreprise tunisienne spécialisée dans la commercialisation et la distribution de matelas de la marque Super Siesta, à travers un réseau de showrooms et de points de vente officiels, ainsi que sa plateforme de vente en ligne.
        </p>
        <p>
          L'entreprise est exploitée par Mohamed Aloulou, représentant commercial de la marque Super Siesta, avec Emna Kallel en qualité de responsable de la gestion administrative.
        </p>
        <p>
          Notre objectif est d'offrir aux clients des produits authentiques, un accompagnement personnalisé, une garantie officielle et un service de livraison sur l'ensemble du territoire tunisien.
        </p>
        <h3 className="text-sm font-bold text-foreground pt-2">Informations de l'entreprise</h3>
        <dl className="grid sm:grid-cols-2 gap-3">
          {[
            ["Nom commercial", "Siesta Officiel"],
            ["Activité", "Commercialisation et distribution de matelas Super Siesta"],
            ["Représentant commercial", "Mohamed Aloulou"],
            ["Gérante administrative", "Emna Kallel"],
            ["Pays", "Tunisie"],
            ["Site internet", "www.siestaofficiel.com"],
            ["Service client", "+216 99 015 100"],
            ["Grand Tunis", "+216 92 187 804"],
            ["Matricule fiscal", "1286444/Y"],
            ["Siège social", "Sfax"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-muted/60 p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </>
    ),
  },
  {
    title: "Réseau de showrooms et points de vente",
    icon: Store,
    content: (
      <>
        <p>
          Siesta Officiel commercialise les matelas Super Siesta à travers plusieurs showrooms et points de vente officiels situés notamment dans les régions suivantes :
        </p>
        <ul>
          <li>Ariana</li>
          <li>Route de Bizerte – Tunis City (Géant)</li>
          <li>Bizerte</li>
          <li>Ezzahra</li>
          <li>Hammam Lif - Boumhel</li>
          <li>Sfax Usine</li>
        </ul>
        <p>
          Les clients peuvent visiter nos points de vente pour découvrir les différentes gammes de matelas et bénéficier des conseils de notre équipe commerciale.
        </p>
        <p>Les adresses exactes et les horaires d'ouverture peuvent être communiqués par notre service client.</p>
      </>
    ),
  },
  {
    title: "Produits et authenticité",
    icon: BadgeCheck,
    content: (
      <>
        <p>
          Les matelas commercialisés par Siesta Officiel sont présentés comme des produits authentiques de la marque Super Siesta.
        </p>
        <p>Chaque achat effectué auprès de notre réseau officiel bénéficie, selon les conditions applicables :</p>
        <ul>
          <li>D'une facture d'achat.</li>
          <li>D'une garantie correspondant au modèle acheté.</li>
          <li>D'un accompagnement commercial avant et après la vente.</li>
          <li>D'une assistance pour le choix du modèle et de ses dimensions.</li>
        </ul>
        <p>La durée et les conditions de garantie varient selon les gammes de matelas.</p>
      </>
    ),
  },
  {
    title: "Commandes sur le site internet",
    icon: ShoppingBag,
    content: (
      <>
        <p>
          Le site www.siestaofficiel.com permet aux clients de consulter les différentes gammes, de sélectionner les dimensions souhaitées et de passer commande en ligne.
        </p>
        <p>
          Après validation de la commande, notre équipe peut contacter le client pour confirmer les informations nécessaires à sa préparation et à sa livraison.
        </p>
        <p>Les prix, promotions et disponibilités sont ceux indiqués sur le site au moment de la commande, sous réserve de confirmation.</p>
      </>
    ),
  },
  {
    title: "Livraison gratuite en Tunisie",
    icon: Truck,
    content: (
      <>
        <p>
          Siesta Officiel propose la livraison gratuite sur l'ensemble du territoire tunisien, pour les commandes de matelas éligibles à cette offre.
        </p>
        <p>
          La livraison est effectuée à l'adresse communiquée par le client, selon les possibilités logistiques et les délais annoncés lors de la confirmation de la commande.
        </p>
        <p>
          Le client doit fournir une adresse exacte et un numéro de téléphone joignable afin de faciliter la livraison.
        </p>
        <p>Les éventuelles contraintes d'accès au domicile doivent être signalées avant l'expédition.</p>
      </>
    ),
  },
  {
    title: "Modalités de paiement",
    icon: CreditCard,
    content: (
      <>
        <p>Siesta Officiel propose le paiement à la livraison pour les commandes éligibles.</p>
        <p>Le client règle le montant de sa commande au moment de la réception du matelas.</p>
        <h3 className="text-sm font-bold text-foreground pt-2">Commandes de matelas aux dimensions non standards</h3>
        <p>
          Pour toute commande de matelas aux dimensions non standards ou fabriqués sur mesure, un acompte obligatoire de 30 % du montant total de la commande est demandé avant le lancement de sa préparation ou de sa fabrication.
        </p>
        <p>Le versement de cet acompte peut être effectué selon l'une des modalités suivantes :</p>
        <ul>
          <li>
            Par virement bancaire sur le compte de l'entreprise, dont les coordonnées sont communiquées au client lors de la confirmation de la commande.
          </li>
          <li>
            Directement dans l'un de nos showrooms officiels, auprès de notre équipe commerciale, avec remise d'un justificatif de paiement.
          </li>
        </ul>
        <p>La commande est définitivement confirmée après réception et vérification du paiement de l'acompte.</p>
        <p>Le solde restant de 70 % est payable à la livraison du matelas, sauf accord contraire convenu avec le client.</p>
        <p>
          Toute demande de modification ou d'annulation d'une commande sur mesure après le lancement de sa fabrication sera examinée conformément aux conditions générales de vente et à la législation tunisienne applicable.
        </p>
        <p>
          Pour toute information complémentaire, notre service client est disponible au{" "}
          <a href="tel:+21699015100">+216 99 015 100</a>.
        </p>
      </>
    ),
  },
  {
    title: "Réception, retour et reprise des matelas",
    icon: PackageCheck,
    content: (
      <>
        <p>
          Lors de la livraison, le client est invité à vérifier la référence, les dimensions, l'état extérieur du matelas ainsi que l'intégrité de son emballage.
        </p>
        <p>En cas de demande de retour ou de reprise, le client doit contacter le service client afin de connaître la procédure applicable.</p>
        <p>
          Pour des raisons d'hygiène et de protection du produit, il est recommandé de conserver le matelas dans son emballage d'origine, fermé, propre et intact, jusqu'à la confirmation de son acceptation.
        </p>
        <h3 className="text-sm font-bold text-foreground pt-2">Conditions de reprise</h3>
        <ul>
          <li>Le matelas doit être conservé dans son état d'origine lorsqu'une reprise est demandée avant utilisation.</li>
          <li>L'emballage d'origine doit être préservé autant que possible.</li>
          <li>Le produit ne doit présenter aucune détérioration, tache ou trace d'utilisation.</li>
          <li>Toute demande doit être communiquée au service client avant l'organisation d'une récupération.</li>
          <li>Les éventuels frais de retour sont communiqués au client selon le motif de la demande et les dispositions légales applicables.</li>
        </ul>
        <p>
          Ces conditions ne limitent pas les droits légaux du consommateur, notamment en cas de produit défectueux, non conforme ou de droit de rétractation applicable.
        </p>
      </>
    ),
  },
  {
    title: "Garantie et service après-vente",
    icon: ShieldCheck,
    content: (
      <>
        <p>Les matelas Super Siesta sont proposés avec des garanties dont la durée dépend du modèle acheté.</p>
        <p>
          Pour bénéficier du service après-vente, le client est invité à conserver sa facture d'achat et les documents de garantie remis avec le produit.
        </p>
        <p>
          Toute demande de garantie fait l'objet d'une vérification conformément aux conditions de garantie du fabricant et aux dispositions légales en vigueur.
        </p>
      </>
    ),
  },
  {
    id: "confidentialite",
    title: "Confidentialité et données personnelles",
    icon: LockKeyhole,
    content: (
      <>
        <p>
          Les informations personnelles collectées lors d'une commande ou d'une demande de renseignements sont utilisées pour le traitement des commandes, la livraison, la facturation et la relation client.
        </p>
        <p>
          Siesta Officiel s'engage à traiter ces informations conformément à la législation tunisienne applicable à la protection des données personnelles, notamment la loi organique n° 2004-63 du 27 juillet 2004.
        </p>
        <p>
          Les informations sont utilisées dans le cadre de ces finalités et ne sont communiquées qu'aux personnes ou prestataires concernés par le traitement de la commande et du service demandé.
        </p>
        <p>
          Pour toute question ou demande relative à vos données personnelles, vous pouvez contacter notre service client au{" "}
          <a href="tel:+21699015100">+216 99 015 100</a>.
        </p>
      </>
    ),
  },
  {
    title: "Propriété intellectuelle",
    icon: Copyright,
    content: (
      <>
        <p>
          Les textes, photographies, éléments graphiques et contenus publiés sur le site www.siestaofficiel.com sont protégés par les règles applicables en matière de propriété intellectuelle.
        </p>
        <p>
          Les marques et logos Super Siesta et Siesta Best appartiennent à leurs titulaires respectifs et sont utilisés dans le cadre des activités commerciales autorisées.
        </p>
        <p>Toute reproduction ou utilisation non autorisée des contenus du site est interdite, sous réserve des exceptions prévues par la loi.</p>
      </>
    ),
  },
  {
    title: "Responsabilité",
    icon: Scale,
    content: (
      <>
        <p>
          Siesta Officiel s'efforce de fournir des informations exactes et actualisées concernant les produits, leurs caractéristiques, leurs prix et leur disponibilité.
        </p>
        <p>Les photographies des produits sont présentées à titre illustratif. Les caractéristiques contractuelles sont celles confirmées lors de la commande.</p>
        <p>L'entreprise ne saurait exclure les responsabilités qui lui incombent en vertu de la législation applicable.</p>
      </>
    ),
  },
  {
    title: "Contact et réclamations",
    icon: Headset,
    content: (
      <>
        <p>
          Pour toute question concernant une commande, une livraison, une garantie ou une demande de retour, notre service client est à votre disposition.
        </p>
        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-5">
          <p className="font-bold text-foreground">Siesta Officiel – Super Siesta</p>
          <p>
            Téléphone : <a href="tel:+21699015100">+216 99 015 100</a>
          </p>
          <p>
            Grand Tunis : <a href="tel:+21692187804">+216 92 187 804</a>
          </p>
          <p>
            Site internet :{" "}
            <a href="https://www.siestaofficiel.com" target="_blank" rel="noreferrer" aria-label="Site Super Siesta (s'ouvre dans un nouvel onglet)">
              www.siestaofficiel.com
            </a>
          </p>
        </div>
        <p className="font-medium text-foreground">
          Siesta Officiel – Achetez auprès de votre réseau officiel, en toute confiance.
        </p>
      </>
    ),
  },
  {
    id: "conditions",
    title: "Conditions",
    icon: ShoppingBag,
    content: (
      <>
        <p>
          Le site permet de consulter les produits et de transmettre une commande. Les prix, promotions et disponibilités applicables sont ceux indiqués au moment de la commande, sous réserve de confirmation par notre équipe.
        </p>
        <p>
          Après validation, notre équipe peut contacter le client afin de confirmer les informations nécessaires à la préparation et à la livraison. Le client doit fournir une adresse exacte et un numéro de téléphone joignable.
        </p>
        <p>
          Le paiement à la livraison est proposé pour les commandes éligibles. Pour les matelas sur mesure ou aux dimensions non standards, un acompte de 30 % est demandé avant le lancement de la préparation ou de la fabrication. Le solde de 70 % est payable à la livraison, sauf accord contraire.
        </p>
        <p>
          Les demandes de modification ou d'annulation d'une commande sur mesure après le début de sa fabrication sont examinées conformément aux conditions applicables et à la législation tunisienne.
        </p>
        <p>
          À la réception, le client est invité à vérifier le produit et son emballage. Toute demande de retour ou de reprise doit être adressée au service client. Ces modalités ne limitent pas les droits légaux du consommateur.
        </p>
        <p>
          La durée et les conditions de garantie dépendent du modèle acheté. La facture et les documents de garantie doivent être conservés pour toute demande de service après-vente.
        </p>
      </>
    ),
  },
  {
    id: "securite",
    title: "Sécurité",
    icon: ShieldCheck,
    content: (
      <>
        <p>
          Siesta Officiel accorde une attention particulière à la confidentialité des informations transmises sur le site. Les données demandées sont destinées aux opérations nécessaires au traitement des commandes et aux échanges avec le client.
        </p>
        <p>
          Nous veillons à limiter l'accès aux informations aux personnes et prestataires qui en ont besoin pour assurer le service demandé. Aucun échange en ligne ne pouvant être garanti comme totalement exempt de risque, nous invitons les clients à ne pas transmettre de mots de passe ni d'informations confidentielles qui ne seraient pas nécessaires à leur demande.
        </p>
        <p>
          Pour toute question concernant la sécurité ou l'utilisation de vos informations, contactez notre service client au{" "}
          <a href="tel:+21699015100">+216 99 015 100</a>.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    icon: LockKeyhole,
    content: (
      <>
        <p>
          Le site utilise le stockage du navigateur pour assurer certaines fonctions, comme mémoriser la langue choisie, conserver le panier et faciliter certaines étapes de commande ou de connexion.
        </p>
        <p>
          Des outils de mesure d'audience et de suivi publicitaire, notamment Google et Meta, sont également intégrés au site. Ces services peuvent utiliser des cookies ou des technologies similaires pour mesurer les visites et les interactions avec nos campagnes.
        </p>
        <p>
          Vous pouvez gérer ou supprimer les cookies et les données de sites depuis les paramètres de votre navigateur. Le blocage du stockage local ou de certains cookies peut toutefois empêcher le bon fonctionnement de fonctionnalités telles que le panier, la mémorisation de la langue ou la connexion.
        </p>
        <p>
          Les traitements réalisés par ces services tiers sont également soumis à leurs propres politiques de confidentialité et paramètres de confidentialité.
        </p>
      </>
    ),
  },
];

export default function MentionsLegales() {
  return (
    <main>
      <section className="relative overflow-hidden bg-accent py-16 md:py-24">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-background/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Informations légales
            </span>
            <h1 className="mt-6 text-4xl font-black tracking-tight md:text-6xl">Mentions légales</h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Retrouvez les informations relatives à Siesta Officiel, à nos produits et aux conditions de nos services.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 md:py-16 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
        <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-28">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Dans cette page
          </h2>
          <nav aria-label="Sommaire des mentions légales">
            <ol className="space-y-1">
              {sections.map((section, index) => (
                <li key={section.title}>
                  <a
                    href={`#${section.id || `mention-${index + 1}`}`}
                    className="flex items-start gap-3 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                  >
                    <span className="mt-0.5 text-xs font-bold text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{section.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="min-w-0 space-y-5">
          {sections.map(({ id, title, icon: Icon, content }, index) => (
            <section
              key={title}
              id={id || `mention-${index + 1}`}
              className="scroll-mt-28 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7"
            >
              <div className="mb-5 flex items-start gap-4 border-b border-border/70 pb-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">
                    Article {index + 1}
                  </p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
                </div>
              </div>
              <div className="space-y-4 text-sm leading-7 text-muted-foreground [&_a]:font-semibold [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                {content}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
