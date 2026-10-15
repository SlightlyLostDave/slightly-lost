import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

type DocumentMiddleware = Parameters<Core.Strapi['documents']['use']>[0];

const ATLAS_ENTRY_UID = 'api::atlas-entry.atlas-entry';

// Strapi 5 enforces required fields on publish but not when a draft is saved.
// locationPolicy has no default on purpose, so an entry must never exist
// without one, draft or not: forgetting it has to be impossible rather than
// something caught later. An update that leaves the field out keeps the stored
// value, which a create has already guaranteed is set.
const requireLocationPolicy: DocumentMiddleware = async (context, next) => {
  if (context.uid !== ATLAS_ENTRY_UID || (context.action !== 'create' && context.action !== 'update')) {
    return next();
  }

  const data = (context.params as { data?: Record<string, unknown> }).data ?? {};
  const isMissing =
    context.action === 'create'
      ? !data.locationPolicy
      : 'locationPolicy' in data && !data.locationPolicy;

  if (isMissing) {
    throw new errors.ValidationError(
      'Location policy is required before an atlas entry can be saved. Choose exact, fuzzed, or withheld.'
    );
  }

  return next();
};

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.documents.use(requireLocationPolicy);
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/* { strapi }: { strapi: Core.Strapi } */) {},
};
