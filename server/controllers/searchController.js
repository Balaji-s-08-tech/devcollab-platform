const Project = require("../models/Project");
const PermissionGrant = require("../models/PermissionGrant");
const searchIndex = require("../services/searchIndexService");

const listAccessibleProjectIds = async (userId) => {
  const projects = await Project.find({
    $or: [{ owner: userId }, { "members.user": userId }],
  }).select("_id").lean();

  const directProjectGrants = await PermissionGrant.find({
    user: userId,
    resourceType: "project",
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).select("resource").lean();

  return [
    ...new Set([
      ...projects.map((p) => p._id.toString()),
      ...directProjectGrants.map((g) => g.resource.toString()),
    ]),
  ];
};

exports.search = async (req, res, next) => {
  try {
    const {
      q = "",
      project,
      workspace,
      organization,
      types = "document,issue,board,user,comment",
      status,
      priority,
      assignee,
      from,
      to,
      page = 1,
      limit = 10,
    } = req.query;

    const typeFilters = types.split(",").map((type) => `type = "${type.trim()}"`);
    const filters = [`(${typeFilters.join(" OR ")})`];

    if (project) {
      filters.push(`projectId = "${project}"`);
    } else if (workspace) {
      filters.push(`workspaceId = "${workspace}"`);
    } else if (organization) {
      filters.push(`organizationId = "${organization}"`);
    } else {
      const projectIds = await listAccessibleProjectIds(req.user._id);
      if (projectIds.length) {
        filters.push(`(projectId IN [${projectIds.map((id) => `"${id}"`).join(", ")}] OR type = "user")`);
      } else {
        filters.push('type = "user"');
      }
    }

    if (status) filters.push(`status = "${status}"`);
    if (priority) filters.push(`priority = "${priority}"`);
    if (assignee) filters.push(`assigneeIds = "${assignee}"`);
    if (from) filters.push(`createdAt >= "${new Date(from).toISOString()}"`);
    if (to) filters.push(`createdAt <= "${new Date(to).toISOString()}"`);

    const result = await searchIndex.search({
      q,
      filters,
      facets: ["type", "status", "priority", "assigneeIds"],
      page,
      limit,
    });

    const grouped = result.hits.reduce((acc, hit) => {
      acc[hit.type] = acc[hit.type] || [];
      acc[hit.type].push(hit);
      return acc;
    }, {});

    res.json({
      success: true,
      query: q,
      data: grouped,
      hits: result.hits,
      facets: result.facetDistribution || {},
      meta: {
        total: result.totalHits,
        page: result.page,
        limit: result.hitsPerPage,
        pages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
};
