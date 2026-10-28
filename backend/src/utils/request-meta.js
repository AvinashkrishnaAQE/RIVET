const MAX_USER_AGENT_LENGTH = 400;

/** Client details recorded against sessions and audit events. */
export function getRequestMeta(req) {
    const userAgent = req.get("user-agent");
    return {
        ip: req.ip ?? null,
        userAgent: userAgent ? userAgent.slice(0, MAX_USER_AGENT_LENGTH) : null,
    };
}
