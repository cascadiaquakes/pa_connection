from aws_cdk import (
    Duration,
    Stack,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_certificatemanager as acm,
    aws_cloudfront_origins as origins,
    CfnOutput,
)
from constructs import Construct


class PaStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # Import existing S3 bucket for frontend hosting
        site_bucket = s3.Bucket.from_bucket_name(
            self,
            "ExistingReactBucket",
            "crescent-react-hosting",
        )

        # S3 origin for frontend static files
        s3_origin = origins.S3BucketOrigin.with_origin_access_control(
            site_bucket,
            origin_path="/pa_connection",
        )

        # CSP scoped to the actual bundle. All JS/CSS is served from 'self';
        # style-src allows inline styles because Cytoscape/tippy set element
        # styles at runtime. frame-ancestors 'none' blocks the site from being
        # embedded in an iframe elsewhere (clickjacking).
        csp = "; ".join([
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "font-src 'self' data:",
            "connect-src 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "upgrade-insecure-requests",
        ])

        response_headers_policy = cloudfront.ResponseHeadersPolicy(
            self,
            "PaSecurityHeaders",
            comment="Security headers for connections-dashboard.cascadiaquakes.org",
            security_headers_behavior=cloudfront.ResponseSecurityHeadersBehavior(
                strict_transport_security=cloudfront.ResponseHeadersStrictTransportSecurity(
                    access_control_max_age=Duration.days(365),
                    include_subdomains=True,
                    preload=True,
                    override=True,
                ),
                content_type_options=cloudfront.ResponseHeadersContentTypeOptions(override=True),
                frame_options=cloudfront.ResponseHeadersFrameOptions(
                    frame_option=cloudfront.HeadersFrameOption.DENY,
                    override=True,
                ),
                referrer_policy=cloudfront.ResponseHeadersReferrerPolicy(
                    referrer_policy=cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
                    override=True,
                ),
                content_security_policy=cloudfront.ResponseHeadersContentSecurityPolicy(
                    content_security_policy=csp,
                    override=True,
                ),
            ),
            custom_headers_behavior=cloudfront.ResponseCustomHeadersBehavior(
                custom_headers=[
                    cloudfront.ResponseCustomHeader(
                        header="Permissions-Policy",
                        value="geolocation=(), camera=(), microphone=(), payment=(), usb=()",
                        override=True,
                    ),
                ],
            ),
        )

        # CloudFront distribution
        distribution = cloudfront.Distribution(
            self,
            "pa-connection",
            domain_names=["connections-dashboard.cascadiaquakes.org"],
            certificate=acm.Certificate.from_certificate_arn(
                self,
                "PaCert",
                "arn:aws:acm:us-east-1:818214664804:certificate/744ef1b1-bbbd-475e-ad42-136337bd77c4"
            ),
            default_root_object="index.html",
            default_behavior=cloudfront.BehaviorOptions(
                origin=s3_origin,
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
                response_headers_policy=response_headers_policy,
            ),
        )

        # Stack outputs
        frontend_url = f"https://{distribution.distribution_domain_name}"

        CfnOutput(
            self,
            "FrontendURL",
            value=f"{frontend_url}/index.html",
            description="partners connections viewer"
        )
