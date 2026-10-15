package com.handsfree.be.dto.response;

/** Deliberate public-field DTO: never serializes identity documents or OCR data. */
public record MatchDetailResponse(MatchResponse match, MatchJobDetailResponse job,
                                  MatchUserResponse profile, UserReputationResponse reputation,
                                  String perspective) {}
